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

rm_error = "ERROR: Existing gallery contains files that aren't symbolic links!\n"+\
          "       Use -f (--force) to remove all files."

import_error = "WARNING: Generating {0} was unsuccessfull! To generate {0} Python Imaging Library needs to be installed."
pil_fonts = pil_thumbs = True

img_fmt  = re.compile('\.(jpg|png|gif|svg)$',re.I)
font_fmt = re.compile('\.(otf|ttf)$',re.I)
vid_fmt = re.compile('\.(mp4|mov|flv|ogg|mp3|wav)$',re.I)
fontname_re = re.compile('[^a-zA-Z0-9_ ]')

def escape(s):#{{{
	return s.replace('\\','\\\\').replace('"','\\"')
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

    For the program to be able to generate thumbnails and font names,
    the Python Imaging Library (PIL) must be installed.

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
"""	% (sys.argv[0], title, gdir, d, url, resolution) )
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
			sys.exit(0)
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
	global rm_error
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
					exit(rm_error)
			cp( os.path.abspath(f), link )

		# clean items directory
		itemdir = gdir+"/items"
		if os.path.isdir(itemdir):
			for f in walk(itemdir):
				# TODO: port
				if not (os.path.islink(f) or force):
					exit(rm_error)
			shutil.rmtree(itemdir)
		os.mkdir(itemdir)

		shutil.copyfile(d+"/config.js", gdir+"/config.js")
	except:
		raise
#}}}

def addFont(fontfile,css):#{{{
	global pil_fonts

	fontname = ""

	if pil_fonts:
		try:
			from PIL import ImageFont

			font = ImageFont.truetype(fontfile,8)
			name = font.getname()
			fontname = name[0]
			if name[1]:
				fontname = fontname + " " + name[1]
		except ImportError:
			print( import_error.format("font names") )
			pil_fonts = False

	css.write("@font-face{font-family:"+fontname_re.sub("_",fontfile)+";src:url('items/"+fontfile+"');}\n")

	return fontname
#}}}

def prepare_html(template,itemfile,css,gdir,files):#{{{
	items = {}
	imgdir = gdir+"/items"
	abs_gdir = os.path.abspath(gdir)

	# find items in "files" directory
	for ff in files:
		for f in walk(ff):
			abs_f = os.path.abspath(f)
			# ignore gallery directory
			if abs_f.startswith(abs_gdir):
				continue

			# filetype (image, font, audio/video)
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
				alias = ""
				if isfont:
					alias = addFont(f,css);

				items[escape(f)] = alias

	itemfile.write('var title = "'+title+'";\n');
	itemfile.write("var ls=[\n")
	for item in sorted(items,key=str.lower):
		alias = items[item]
		if alias:
			line = '["%s",{alias:"%s"}]' % (item,alias)
		else:
			line = '"%s"' % item
		itemfile.write(line+',\n')
	itemfile.write("];\n");

	return items
#}}}

def create_thumbnails(items,imgdir,thumbdir,resolution,itemfile):#{{{
	global pil_thumbs

	if not pil_thumbs:
		return

	try:
		from PIL import Image

		# number of images
		n = len( filter(img_fmt.search,items.keys()) )
		if n == 0:
			return # no images

		# create thumbnail directory
		os.makedirs(thumbdir)

		i = 0
		bar = ">" + (" "*progress_len)
		sys.stdout.write( "Creating thumbnails: [%s] %d/%d\r"%(bar,0,n) )

		lines = "var ls=[\n"
		for f in sorted(items,key=str.lower):
			alias = items[f]
			if img_fmt.search(f):
				# create thumbnail
				im = Image.open(imgdir+"/"+f)
				im = im.convert("RGBA")
				im.thumbnail((resolution,resolution), Image.ANTIALIAS)
				im.save(thumbdir+"/"+os.path.basename(f) + ".png", "PNG", quality=60)
				lines = lines + ( '["%s",{alias:"%s"},%d,%d],\n' % (f,alias,im.size[0],im.size[1]) )

				# show progress bar
				i=i+1
				l = i*progress_len/n
				bar = ("="*l) + ">" + (" "*(progress_len-l))
				sys.stdout.write( "Creating thumbnails: [%s] %d/%d%s"%(bar,i,n,i==n and "\n" or "\r") );
				sys.stdout.flush()
			elif alias:
				lines = lines + ('["%s",{alias:"%s"}],\n' % (f,alias))
			else:
				lines = lines + ( '"%s",\n' % f )
		lines = lines + "];\n"

		# rewrite items.js
		itemfile.seek(0)
		itemfile.truncate()
		itemfile.write('var title = "'+title+'";\n');
		itemfile.write(lines)

		print("Thumbnails successfully generated.")
	except ImportError:
		print( import_error.format("thumbnails") )
		pil_thumbs = False
#}}}

def main(argv):#{{{
	global img_fmt, font_fmt, fontname_re

	files,title,resolution,gdir,url,d,force = parse_args(argv)

	prepare_gallery(d,gdir,force)

	template = open( d+"/template.html", "r" );
	itemfile = open( gdir+"/items.js", "w" )
	css = open( gdir+"/fonts.css", "w" )

	items = prepare_html(template,itemfile,css,gdir,files)

	template.close()
	css.close()

	if url:
		itemfile.flush()
		launch_browser(url)

	thumbdir = gdir+"/thumbs"
	if os.path.isdir(thumbdir):
		shutil.rmtree(thumbdir)
	if resolution>0:
		create_thumbnails(items, gdir+"/items",thumbdir,resolution,itemfile)

	itemfile.close()

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv)

