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

img_fmt  = re.compile('(jpg|png|gif|svg)$',re.I)
font_fmt = re.compile('(otf|ttf)$',re.I)
fontname_re = re.compile('[^a-zA-Z0-9_ ]')

def usage():#{{{
	global title, resolution, gdir, url, d
	print """\
usage: %s [options] [gallery_name]

    Creates new gallery (named "gallery_name") in script
    directory; the gallery contains all images found in
    current directory.

    For program to be able to generate thumbnails, you
    must have Python Imaging Library (PIL) is installed.

    If BROWSER environment variable is set, the gallery
    is automatically viewed using web browser $BROWSER.

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

    -r 0, --resolution=0    don't generate thumbnails
    -u "", --url=""         don't launch web browser
"""\
			% (sys.argv[0], title, resolution, gdir, url, d)
#}}}

def walkdir(root):#{{{
	for f in os.listdir(root):
		if os.path.isdir(root+"/"+f):
			for ff in walkdir(root+"/"+f):
				yield f+"/"+ff
		else:
			yield f
#}}}

def launch_browser():#{{{
	if os.environ.has_key('BROWSER'):
		if os.fork() == 0:
			browser = os.environ['BROWSER']
			print "Lauching web browser ("+browser+")."
			# TODO: port
			os.execv("/usr/bin/env",("/usr/bin/env",browser,url))
#}}}

def parse_args(argv):#{{{
	global title, resolution, gdir, url, d

	try:
		opts, args = getopt.getopt(argv[1:], "ht:r:d:u:",
				["help", "title=", "resolution=", "directory=", "url=","template="])
	except getopt.GetoptError:
		usage()
		sys.exit(2)

	if len(args) == 1:
		title = args[0]
	elif len(args) > 1:
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
				print ("Error: Resolution must be single number!")
				sys.exit(2)

	gdir = gdir % title
	url = url % title

	return title,resolution,gdir,url,d
#}}}

def prepare_gallery(d,gdir):#{{{
	try:
		if not os.path.isdir(gdir):
			os.makedirs(gdir)
		# TODO: port (symbolic links only on UNIX-like platforms)
		links = {
				os.path.abspath("."):gdir+"/imgs",
				d+"/files":gdir+"/files",
				d+"/template.html":gdir+"/index.html"
				}
		for f,link in links.iteritems():
			if os.path.islink(link):
				os.remove(link)
			os.symlink(f,link)

		shutil.copyfile(d+"/config.js", gdir+"/config.js")
	except:
		raise
#}}}

def addFont(fontfile,css):#{{{
	fontname = fontfile

	try:
		from PIL import ImageFont

		font = ImageFont.truetype(fontfile,8)
		name = font.getname()
		fontname = name[0]+" "+name[1]+" ("+fontfile+")"
	except:
		pass

	css.write("@font-face{font-family:"+fontname_re.sub("_",fontname)+";src:url('imgs/"+fontfile+"');}\n")

	return fontname
#}}}

def prepare_html(template,itemfile,css,imgdir):#{{{
	itemfile.write("var ls=[\n")
	items = []
	for f in walkdir(imgdir):
		isimg = isfont = False
		isimg = img_fmt.search(f) != None
		if not isimg:
			isfont = font_fmt.search(f) != None
		if isimg or isfont:
			# if file is font: create font-face line in css
			if isfont:
				f = addFont(f,css);
			items.append(f.replace("'","\\'"))

	items.sort()
	for item in items:
		itemfile.write("'"+item+"',\n")

	itemfile.write("];\nvar title = '"+title+"';");
#}}}

def create_thumbnails(imgdir,thumbdir,resolution):#{{{
	try:
		if os.path.isdir(thumbdir):
			shutil.rmtree(thumbdir)

		images = []
		for f in walkdir(imgdir):
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

	title,resolution,gdir,url,d = parse_args(argv)

	prepare_gallery(d,gdir)

	template = open( d+"/template.html", "r" );
	itemfile = open( gdir+"/items.js", "w" )
	css = open( gdir+"/fonts.css", "w" )
	imgdir = gdir+"/imgs"

	prepare_html(template,itemfile,css,imgdir)

	template.close()
	itemfile.close()
	css.close()

	if url:
		launch_browser()
	
	if resolution>0:
		thumbdir = gdir+"/thumbs"
		create_thumbnails(imgdir,thumbdir,resolution)

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv)

