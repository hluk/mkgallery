#!/usr/bin/python
"""
Creates web gallery of images and fonts present in current directory
"""
import os, sys, re, getopt, shutil, glob

# default values:
title="default" # html title and gallery directory name
resolution = 300 # thumbnail resolution
url = "http://127.0.0.1:8080/galleries/" # browser url
progress_len = 40 # progress bar length

img_fmt  = re.compile('(jpg|png|gif|svg)$',re.I)
font_fmt = re.compile('(otf|ttf)$',re.I)
fontname_re = re.compile('[^a-zA-Z0-9_]')

def usage():#{{{
		print """\
usage: %s [options] [gallery_name]

    Creates new gallery (named "gallery_name") in script
    directory; the gallery contains all images found in
    current directory.

    For program to be able to generate thumbnails, you
    must have Python Imaging Library (PIL) is installed.

    If BROWSER environment variable is set, the gallery
    is automatically viewed using web browser $BROWSER

options:
    -h, --help              prints this help
    -t, --title=<title>     gallery title and directory name (default: '%s')
    -r, --resolution=<res>  resolution for thumbnails in pixels (default: %s)"""\
			% (sys.argv[0], title, resolution)
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
	global title, resolution

	try:
		opts, args = getopt.getopt(argv[1:], "htr:", ["help", "title=", "resolution="])
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
		elif opt in ("-r", "--resolution"):
			try:
				resolution = int(arg)
			except:
				print ("Error: Resolution must be single number!")
				sys.exit(2)

	return title,resolution
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

def prepare_html(template,itemfile,css,imgdir):#{{{
	itemfile.write("var ls=[\n")
	items = []
	for f in walkdir(imgdir):
		isimg = isfont = False
		isimg = img_fmt.search(f) != None
		if not isimg:
			isfont = font_fmt.search(f) != None
		if isimg or isfont:
			items.append(f)
			# if file is font: create font-face line in css
			if isfont:
				fontname = fontname_re.sub("_",f)
				css.write("@font-face{font-family:"+fontname+";src:url('imgs/"+f+"');}\n")

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
	global url, img_fmt, font_fmt, fontname_re

	title,resolution = parse_args(argv)

	d = os.path.dirname(argv[0])
	gdir = d + "/galleries/" + title;
	url = url + title

	prepare_gallery(d,gdir)

	template = open( d+"/template.html", "r" );
	itemfile = open( gdir+"/items.js", "w" )
	css = open( gdir+"/fonts.css", "w" )
	imgdir = gdir+"/imgs"

	prepare_html(template,itemfile,css,imgdir)

	template.close()
	itemfile.close()
	css.close()

	launch_browser()
	
	thumbdir = gdir+"/thumbs"
	create_thumbnails(imgdir,thumbdir,resolution)

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv)

