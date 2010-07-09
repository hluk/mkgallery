#!/usr/bin/python
"""
Creates web gallery of images and fonts present in current directory
"""
import os, sys, re, getopt, shutil, glob
# default values:
title="default" # html title and gallery directory name
resolution = 300 # thumbnail resolution
d = os.path.dirname(sys.argv[0]) or "." # path to template
gdir = d + "/galleries/%s"; # path to gallery
url = "file:///<path_to_gallery>/index.html" # browser url
progress_len = 40 # progress bar length
create_liks = True; # create symbolic links instead of copy
cp = os.symlink # default is create symbolic links
force = False # don't delete files

rmerror = "ERROR: Existing gallery contains files that aren't symbolic links!\n"+\
          "       Use -f (--force) to remove all files."

img_fmt  = re.compile('\.(jpg|png|gif|svg)$',re.I)
font_fmt = re.compile('\.(otf|ttf)$',re.I)
vid_fmt = re.compile('\.(mp4|mov|flv|ogg|mp3|wav)$',re.I)
fontname_re = re.compile('[^a-zA-Z0-9_ ]')

def sort(x,y,state=-1):#{{{
	if not len(x):
		return len(y) and -1 or state
	elif not len(y):
		return 1

	a,b = x[0],y[0]
	aa,bb = a.lower(), b.lower()
	if aa>bb:
		return 1
	elif bb>aa:
		return -1

	return sort(x[1:],y[1:],a>b and 1 or -1)
#}}}

def copy(src, dest):#{{{
	if os.path.isdir(src):
		shutil.copytree( src, dest )
	else:
		shutil.copyfile( src, dest )
#}}}

def usage():#{{{
	global title, resolution, gdir, url, d
	print ( """\
usage: %s [options] [directories|filenames]

    Creates HTML gallery containing images and fonts recursively
    found in given directories and files or in the current directory.

    If BROWSER environment variable is set, the gallery is
    automatically viewed using web browser $BROWSER.

    For program to be able to generate thumbnails and font names,
    you must have Python Imaging Library (PIL) is installed.

options:
    -h, --help              prints this help
    -t, --title=<title>     gallery title
                              (default: '%s')
    -d, --directory=<dir>   path to gallery (%%s is replaced by <title>)
                              (default: '%s')
    --template=<dir>        path to template html and support files
                              (default: '%s')
    -u, --url=<url>         url location for web browser (%%s is replaced by <title>)
                              (default: '%s')
    -r, --resolution=<res>  resolution for thumbnails in pixels
                              (default: %s)
    -c, --copy              copy files instead of creating symbolic links
	-f, --force             overwrites existing gallery

    -r 0, --resolution=0    don't generate thumbnails
    -u "", --url=""         don't launch web browser
"""	% (sys.argv[0], title, resolution, gdir, url, d) )
#}}}

def walk(root):#{{{
	if os.path.isdir(root):
		for f in os.listdir(root):
			for ff in walk(root == "." and f or root+"/"+f):
				yield ff
	else:
		yield root
#}}}

def launch_browser(url):#{{{
	try:
		if os.fork() == 0:
			browser = os.environ['BROWSER']
			print("Lauching web browser ("+browser+").")
			if not url.lower().endswith("index.html"):
				url = url+"/index.html"
			# TODO: port
			os.execv("/usr/bin/env",("/usr/bin/env",browser,url))
	except:
		pass
#}}}

def parse_args(argv):#{{{
	global title, resolution, gdir, url, d, create_links, cp, force

	try:
		opts, args = getopt.getopt(argv[1:], "ht:r:d:u:cf",
				["help", "title=", "resolution=", "directory=", "url=","template=","copy","force"])
	except getopt.GetoptError:
		usage()
		sys.exit(2)

	newurl = ""
	for opt, arg in opts:
		if opt in ("-h", "--help"):
			usage()
			sys.exit(2)
		elif opt in ("-t", "--title"):
			title = arg
		elif opt in ("-d", "--directory"):
			gdir = arg
		elif opt in ("-u", "--url"):
			newurl = arg
		elif opt == "--template":
			d = arg
		elif opt in ("-r", "--resolution"):
			try:
				resolution = int(arg)
			except:
				exit("ERROR: Resolution must be single number!")
		elif opt in ("-c", "--copy"):
			cp = copy
		elif opt in ("-f", "--force"):
			force = True

	try:    gdir = gdir % title
	except: pass

	url = newurl and newurl or "file://"+ os.path.abspath(gdir) + "/index.html"

	try:    url = url % title
	except: pass

	return (args and args or ["."]),title,resolution,gdir,url,d,force
#}}}

def prepare_gallery(d,gdir,force):#{{{
	global rmerror
	try:
		if not os.path.isdir(gdir):
			os.makedirs(gdir)
		# TODO: port (symbolic links only on UNIX-like platforms)
		links = {
				d+"/files":gdir+"/files",
				d+"/template.html":gdir+"/index.html"
				}
		for f in links:
			link = links[f]
			if os.path.islink(link):
				os.remove(link)
			elif os.path.isdir(link):
				if force:
					shutil.rmtree(link)
				else:
					exit(rmerror)
			cp( f, link )

		# clean items directory
		itemdir = gdir+"/items"
		if os.path.isdir(itemdir):
			for f in walk(itemdir):
				# TODO: port
				if not (os.path.islink(f) or force):
					exit(rmerror)
			shutil.rmtree(itemdir)
		os.mkdir(itemdir)

		shutil.copyfile(d+"/config.js", gdir+"/config.js")
	except:
		raise
#}}}

def addFont(fontfile,css):#{{{
	fontname = None

	try:
		from PIL import ImageFont

		font = ImageFont.truetype(fontfile,8)
		name = font.getname()
		fontname = name[0]
		if name[1]:
			fontname = fontname + " " + name[1]
	except ImportError:
		pass

	css.write("@font-face{font-family:"+fontname_re.sub("_",fontfile)+";src:url('items/"+fontfile+"');}\n")

	return fontname
#}}}

def prepare_html(template,itemfile,css,gdir,files):#{{{
	items = []
	aliases = {}
	imgdir = gdir+"/items"
	abs_gdir = os.path.abspath(gdir)

	# find items in "files" directory
	for ff in files:
		for f in walk(ff):
			abs_f = os.path.abspath(f)
			# ignore gallery directory
			if abs_f.startswith(abs_gdir):
				continue
			isimg = isfont = isvid = False
			isimg = img_fmt.search(f) != None
			if not isimg:
				isfont = font_fmt.search(f) != None
				if not isfont:
					isvid = vid_fmt.search(f) != None
			if isimg or isfont or isvid:
				fdir = imgdir+"/"+os.path.dirname(f)
				if not os.path.isdir(fdir):
					os.makedirs(fdir)
				cp( abs_f, fdir+"/" + os.path.basename(f) )

				# if file is font: create font-face line in css
				if isfont:
					fontname = addFont(f,css);
					# add font name
					if fontname:
						aliases[f] = fontname
				items.append(f.replace("'","\\'"))

	items.sort(sort)
	itemfile.write("var ls=[\n")
	for item in items:
		try:
			alias = aliases[item]
		except:
			alias = None
		itemname = item.replace('\\','\\\\').replace('"','\\"')
		if alias:
			line = '["%s","%s"]' % (itemname,alias)
		else:
			line = '"%s"' % itemname
		itemfile.write(line+',\n')
	itemfile.write("];\n");

	itemfile.write('var title = "'+title+'";\n');

	#itemfile.write("var aliases={\n")
	#for f,alias in aliases.items():
		#itemfile.write('"'+f+'":"'+alias.replace('\\','\\\\').replace('"','\\"')+'",\n')
	#itemfile.write("};");
#}}}

def create_thumbnails(imgdir,thumbdir,resolution):#{{{
	try:
		from PIL import Image

		images = []
		for f in walk(imgdir):
			if img_fmt.search(f):
				images.append(f)

		n = len(images)
		if n == 0: return

		os.makedirs(thumbdir)

		i = 0
		bar = ">" + (" "*progress_len)
		sys.stdout.write( "Creating thumbnails: [%s] %d/%d\r"%(bar,0,n) );
		for f in images:
			im = Image.open(f)
			im = im.convert("RGBA")
			im.thumbnail((resolution,resolution), Image.ANTIALIAS)
			im.save(thumbdir+"/"+os.path.basename(f) + ".png", "PNG", quality=60)

			# TODO: show progress bar
			i=i+1
			l = i*progress_len/n
			bar = ("="*l) + ">" + (" "*(progress_len-l))
			sys.stdout.write( "Creating thumbnails: [%s] %d/%d%s"%(bar,i,n,i==n and "\n" or "\r") );
			sys.stdout.flush()

		print("Thumbnails successfully generated.")
	except ImportError:
		print("Warning: Generating thumbnails was unsuccessfull!")
		raise
#}}}

def main(argv):#{{{
	global img_fmt, font_fmt, fontname_re

	files,title,resolution,gdir,url,d,force = parse_args(argv)

	prepare_gallery(d,gdir,force)

	template = open( d+"/template.html", "r" );
	itemfile = open( gdir+"/items.js", "w" )
	css = open( gdir+"/fonts.css", "w" )

	prepare_html(template,itemfile,css,gdir,files)

	template.close()
	itemfile.close()
	css.close()

	if url:
		launch_browser(url)

	thumbdir = gdir+"/thumbs"
	if os.path.isdir(thumbdir):
		shutil.rmtree(thumbdir)
	if resolution>0:
		create_thumbnails(gdir+"/items",thumbdir,resolution)

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv)

