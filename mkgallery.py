#!/usr/bin/python
"""
Creates web gallery of images and fonts present in current directory
"""
import os, sys, re, getopt, shutil, glob

# default values:
title="default" # html title and gallery directory name
resolution = 300 # thumbnail resolution
url = "http://127.0.0.1:8080/galleries/%s" # browser url
d = os.path.dirname(sys.argv[0]) # path to template
gdir = d + "/galleries/%s";
progress_len = 40 # progress bar length
create_liks = True; # create symbolic links instead of copy
cp = os.symlink
force = False

rmerror = "ERROR: Existing gallery contains files that aren't symbolic links!\n"+\
          "       Use -f (--force) to remove all files."

img_fmt  = re.compile('(jpg|png|gif|svg)$',re.I)
font_fmt = re.compile('(otf|ttf)$',re.I)
fontname_re = re.compile('[^a-zA-Z0-9_ ]')

def copy(src, dest):#{{{
	if os.path.isdir(src):
		shutil.copytree( src, dest )
	else:
		shutil.copyfile( src, dest )
#}}}

def usage():#{{{
	global title, resolution, gdir, url, d
	print """\
usage: %s [options] [directories|filenames]

    Creates HTML gallery containing images and fonts recursively
    found in given directories and files or in the current directory.

    If BROWSER environment variable is set, the gallery is
    automatically viewed using web browser $BROWSER.

    For program to be able to generate thumbnails and font names,
    you must have Python Imaging Library (PIL) is installed.

options:
    -h, --help              prints this help
    -t, --title=<title>     gallery title and directory name
                              (default: '%s')
    -r, --resolution=<res>  resolution for thumbnails in pixels
                              (default: %s)
    -d, --directory=<dir>   gallery is saved (%%s is replaced by <title>)
                              (default: '%s')
    -u, --url=<url>         url location for web browser (%%s is replaced by <title>)
                              (default: '%s')
    --template=<dir>        path to template html and support files
                              (default: '%s')
    -c, --copy              copy files instead of creating symbolic links
	-f, --force             overwrites existing gallery

    -r 0, --resolution=0    don't generate thumbnails
    -u "", --url=""         don't launch web browser
"""\
			% (sys.argv[0], title, resolution, gdir, url, d)
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
	if os.environ.has_key('BROWSER'):
		if os.fork() == 0:
			browser = os.environ['BROWSER']
			print "Lauching web browser ("+browser+")."
			if not url.lower().endswith("index.html"):
				url = url+"/index.html"
			# TODO: port
			os.execv("/usr/bin/env",("/usr/bin/env",browser,url))
#}}}

def parse_args(argv):#{{{
	global title, resolution, gdir, url, d, create_links, cp, force

	try:
		opts, args = getopt.getopt(argv[1:], "ht:r:d:u:cf",
				["help", "title=", "resolution=", "directory=", "url=","template=","copy","force"])
	except getopt.GetoptError:
		usage()
		sys.exit(2)

	for opt, arg in opts:
		if opt in ("-h", "--help"):
			usage()
			sys.exit(2)
		elif opt in ("-t", "--title"):
			title = arg
		elif opt in ("-d", "--directory"):
			gdir = arg
		elif opt in ("-u", "--url"):
			url = arg
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
		for f,link in links.iteritems():
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
	try:
		from PIL import ImageFont

		font = ImageFont.truetype(fontfile,8)
		name = font.getname()
		fontname = name[0]+" "+name[1]
	except:
		pass

	css.write("@font-face{font-family:"+fontname_re.sub("_",fontfile)+";src:url('items/"+fontfile+"');}\n")

	return fontname
#}}}

def prepare_html(template,itemfile,css,imgdir,files_dir):#{{{
	items = []
	aliases = {}
	# find items in "files" directory
	for ff in files_dir:
		for f in walk(ff):
			isimg = isfont = False
			isimg = img_fmt.search(f) != None
			if not isimg:
				isfont = font_fmt.search(f) != None
			if isimg or isfont:
				fdir = imgdir+"/"+os.path.dirname(f)
				if not os.path.isdir(fdir):
					os.makedirs(fdir)
				cp( os.path.abspath(f), fdir+"/" + os.path.basename(f) )

				# if file is font: create font-face line in css
				fontname = ""
				if isfont:
					fontname = addFont(f,css);
				# add font name
				if fontname:
					aliases[f] = fontname
				items.append(f.replace("'","\\'"))

	items.sort()
	itemfile.write("var ls=[\n")
	for item in items:
		itemfile.write("'"+item+"',\n")
	itemfile.write("];\n");

	itemfile.write("var title = '"+title+"';\n");

	itemfile.write("var aliases={\n")
	for f,alias in aliases.items():
		itemfile.write("'"+f+"':'"+alias+"',\n")
	itemfile.write("};");
#}}}

def create_thumbnails(imgdir,thumbdir,resolution):#{{{
	try:
		if os.path.isdir(thumbdir):
			shutil.rmtree(thumbdir)

		images = []
		for f in walk(imgdir):
			if img_fmt.search(f):
				images.append(f)

		n = len(images)
		if n == 0: return

		from PIL import Image

		os.makedirs(thumbdir)

		i = 0
		bar = ">" + (" "*progress_len)
		sys.stdout.write( "Creating thumbnails: [%s] %d/%d\r"%(bar,0,n) );
		for f in images:
			im = Image.open(f)
			im.thumbnail((resolution,resolution), Image.ANTIALIAS)
			im.save(thumbdir+"/"+os.path.basename(f) + ".png", "PNG")

			# TODO: show progress bar
			i=i+1
			l = i*progress_len/n
			bar = ("="*l) + ">" + (" "*(progress_len-l))
			sys.stdout.write( "Creating thumbnails: [%s] %d/%d%s"%(bar,i,n,i==n and "\n" or "\r") );
			sys.stdout.flush()

		print("Thumbnails successfully generated.")
	except:
		print("Warning: Generating thumbnails was unsuccessfull!")
		raise
#}}}

def main(argv):#{{{
	global img_fmt, font_fmt, fontname_re

	files_dir,title,resolution,gdir,url,d,force = parse_args(argv)

	prepare_gallery(d,gdir,force)

	template = open( d+"/template.html", "r" );
	itemfile = open( gdir+"/items.js", "w" )
	css = open( gdir+"/fonts.css", "w" )
	imgdir = gdir+"/items"

	prepare_html(template,itemfile,css,imgdir,files_dir)

	template.close()
	itemfile.close()
	css.close()

	if url:
		launch_browser(url)

	thumbdir = gdir+"/thumbs"
	if resolution>0:
		create_thumbnails(imgdir,thumbdir,resolution)
	elif os.path.isdir(thumbdir):
		shutil.rmtree(thumbdir)

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv)

