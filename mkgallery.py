#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
Creates web gallery of images and fonts present in current directory

Script parameters are switches (see usage()) and filenames (files and
directories).

Script recursively finds usable items in specified files and directories by
examining file extensions.

Supported file types (and extensions) are:
	* images (jpg, png, apng, gif, svg),
	* fonts (otf, ttf),
	* audio/movies (mp4, mov, flv, ogg, mp3, wav).

Function create_gallery() returns list of items. The list format is:
	{
		"item": # this represents the item in gallery (i.e. "items/img.png")
			{ # all keys here are optional
				# use another name (e.g. font name)
				"alias": "item alias",
				# path to the original file
				"link": "link to original filename",
				# thumbnail size (see description below)
				"thumbnail_size": [width, height]
			}
		...
	}

Function write_items() saves the list in JavaScript format:
var ls = [
	[ "item",
		{
			"alias": "item alias",
			"link": "link to original filename",
			"thumbnail_size": [width, height],
		}
	],
	...
]

Creating thumbnails can take a long time to complete therefore if user wants to
view the gallery, the list of items is saved before without "thumbnail_size" and
the thumbnails are generated afterwards.
"""

import os, sys, re, getopt, shutil, glob, locale, codecs

# Python Imaging Library (PIL)
has_pil = True
try:
	from PIL import Image, ImageFont, ImageDraw, ImageChops
except ImportError:
	has_pil = False

S = os.sep
# input/argument encoding
Locale = locale.getdefaultlocale()[1]

# default values:
title="default" # html title and gallery directory name
resolution = 300 # thumbnail resolution
d = os.path.dirname(sys.argv[0]) or "." # path to template
home = 'HOME' in os.environ and os.environ['HOME'] or os.environ['HOMEDRIVE']+os.environ['HOMEPATH']+S+"My Documents"
gdir = home +S+ "Galleries" +S+ "%s"; # path to gallery
url = "file:///<path_to_gallery>/index.html" # browser url
progress_len = 40 # progress bar length

force = False # force file deletion?
font_render = False # render fonts?
font_size, font_text = 16, ""

rm_error = "ERROR: Existing gallery contains files that aren't symbolic links!\n"+\
          "       Use -f (--force) to remove all files."

# python3: change u'...' to '...'
re_flags = re.IGNORECASE|re.UNICODE
re_img  = re.compile(ur'\.(jpg|png|apng|gif|svg)$', re_flags)
re_font = re.compile(ur'\.(otf|ttf)$', re_flags)
re_vid = re.compile(ur'\.(mp4|mov|flv|ogg|mp3|wav)$', re_flags)
re_remote = re.compile(ur'^\w+://', re_flags)
re_fontname = re.compile(ur'[^a-z0-9_]+', re_flags)

local = False

def from_locale(string):#{{{
	global Locale
	return string.decode( Locale ).replace('\\n', '\n')
#}}}

def copy(src, dest):#{{{
	if os.path.isdir(src):
		shutil.copytree( src, dest )
	else:
		shutil.copyfile( src, dest )
#}}}

# default is create symbolic links
# if operation not supported, copy all files
try:
	cp = os.symlink
except:
	cp = copy

def usage():#{{{
	global title, resolution, gdir, url, d
	print ( """\
usage: %s [options] [directories|filenames]

    Creates HTML gallery containing images and fonts recursively
    found in given directories and files or in the current directory.

    The gallery is automatically viewed with default web browsser.

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
    -l, --local             don't copy or create links to gallery items,
                            browse items locally, i.e. protocol is "file://"
    -x, --render=<size>,<text>
                            render fonts instead using them directly

    -r 0, --resolution=0    don't generate thumbnails
    -u "", --url=""         don't launch web browser
"""	% (sys.argv[0], title, gdir, d, url, resolution) )
#}}}

def dirname(filename):#{{{
	return os.path.dirname(filename).replace(':','_')
#}}}

def to_url(filename):#{{{
	global local

	if filename.startswith('items'+S) or not is_local(filename) or not local:
		url = filename
	else:
		url = 'file://'+os.path.abspath(filename).replace(S,'/').replace(':',"_")

	# escape double quotes (filenames in items.js enclosed in double quotes)
	url.replace('"','\\"')

	# escape # and ? characters in local filenames (see esc() in "files/gallery.js")
	#if is_local(filename):
		#url = url.replace('#','%23').replace('?','%3F')

	return url
#}}}

def walk(root):#{{{
	if os.path.isdir(root):
		for f in os.listdir(root):
			for ff in walk(root == "." and f or root+S+f):
				yield ff
	else:
		yield root
#}}}

def launch_browser(url):#{{{
	sys.stdout.write("Lauching default web browser: ")
	ok = False;

	try:
		import webbrowser
		# open browser in background
		w = webbrowser.BackgroundBrowser( webbrowser.get().basename )
		if w.open(url):
			ok = True;
	except:
		pass;

	print(ok and "DONE" or "FAILED!")
#}}}

def parse_args(argv):#{{{
	global title, resolution, gdir, url, d, cp, force, local, \
			font_render, font_size, font_text

	try:
		opts, args = getopt.getopt(argv, "ht:r:d:u:cflx:",
				["help", "title=", "resolution=", "directory=", "url=",
					"template=", "copy", "force", "local", "render="])
	except getopt.GetoptError:
		usage()
		sys.exit(2)

	newurl = None
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
				if resolution<0:
					resolution = 0
			except:
				print("ERROR: Resolution must be single number!")
				sys.exit(1)
		elif opt in ("-c", "--copy"):
			cp = copy
		elif opt in ("-l", "--local"):
			local = True
		elif opt in ("-f", "--force"):
			force = True
		elif opt in ("-x", "--render"):
			font_render = True
			try:
				font_size, font_text = arg.split(',', 1)
				font_size = int(font_size)
			except:
				usage()
				sys.exit(1)

	# no PIL: warnings, errors
	if not has_pil:
		# cannot render font without PIL
		if font_render:
			print("ERROR: Cannot render font -- please install Python Imaging Library (PIL) module first.")
			sys.exit(10)
		# no thumbnails
		if resolution:
			print("WARNING: Thumbnails not generated -- please install Python Imaging Library (PIL) module.")
			resolution = 0

	try:
		gdir = gdir % title
	except:
		pass

	if newurl != None:
		url = newurl
	else:
		url = "file://"+ os.path.abspath(gdir) + "/index.html"

	try:
		url = url % title
	except:
		pass

	return args and args or ["."]
#}}}

def clean_gallery():#{{{
	global rm_error, d, gdir, force

	if not os.path.isdir(gdir):
		os.makedirs(gdir)
	# TODO: port (symbolic links only on UNIX-like platforms)
	links = {
			d+S+"files":gdir+S+"files",
			d+S+"template.html":gdir+S+"index.html"
			}
	for f in links:
		link = links[f]
		if os.path.islink(link):
			os.remove(link)
		elif force and os.path.isfile(link):
			os.remove(link)
		elif os.path.isdir(link):
			if force:
				shutil.rmtree(link)
			else:
				exit(rm_error)
		cp( os.path.abspath(f), link )

	# clean items directory
	itemdir = gdir+S+"items"
	if os.path.isdir(itemdir):
		for f in walk(itemdir):
			# TODO: port
			if not (os.path.islink(f) or force):
				exit(rm_error)
		shutil.rmtree(itemdir)

	# clean thumbnail directory
	thumbdir = gdir+S+"thumbs"
	if os.path.isdir(thumbdir):
		if not force:
			exit(rm_error)
		shutil.rmtree(thumbdir)

	# omit item directory when creating local gallery
	if not local:
		os.mkdir(itemdir)

	shutil.copyfile(d+S+"config.js", gdir+S+"config.js")
#}}}

def addFont(fontfile, cssfile):#{{{
	global re_fontname, gdir

	# font file path
	f = fontfile
	if not local and is_local(fontfile):
		f = gdir +S+ f

	# TODO: fetch remote font?
	if not is_local(f):
		exit("ERROR: Don't know how to handle remote fonts!")

	# font name
	fontname = None
	try:
		font = ImageFont.truetype(f,8)
		name = font.getname()
		fontname = name[0]
		if name[1]:
			fontname = fontname + " " + name[1]
	except Exception as e:
		print("ERROR: "+str(e)+" (file: \""+fontfile+"\")")

	# render font
	outfile = fontfile
	link = None
	if font_render:
		outfile = "items" +S+ fontfile + ".png"
		link = fontfile
		try:
			renderFont(f, font_size, font_text, gdir +S+ outfile)
		except Exception as e:
			print("ERROR: "+str(e)+" (file: \""+fontfile+"\")")
	else:
		p = from_locale(to_url(fontfile))
		cssfile.write("@font-face{font-family:"+re_fontname.sub("_", p)+";src:url('"+p+"');}\n")

	return outfile, fontname, link
#}}}

def renderFont(fontfile, size, text, outfile):#{{{
	f = ImageFont.truetype(fontfile, size, encoding="unic")

	w = 0
	h = size/2
	im = Image.new("RGB", (w,h), "white")

	# render lines
	for line in ( from_locale(text) +'\n').split('\n'):
		if line:
			w2,h2 = f.getsize(line)
			w2 = w2+size
			h2 = h2
			im2 = Image.new("RGB", (w2,h2), "white")

			# render line
			draw = ImageDraw.Draw(im2)
			draw.text( (size/2,0), line, fill="black", font=f )
		else:
			# empty line
			w2 = 0
			h2 = size/2
			im2 = Image.new("RGB", (w2,h2), "white")

		w3 = max(w,w2)
		h3 = h+h2
		im3 = Image.new("RGB", (w3,h3), "white")

		# join images
		im3.paste( im, (0,0,w,h) )
		im3.paste( im2, (0,h,w2,h3) )

		im = im3
		w, h = w3, h3

	d = dirname(outfile)
	if not os.path.isdir(d):
		os.makedirs(d)
	im.save(outfile, "PNG")
#}}}

def itemline(filename, props=None):#{{{
	# filename
	# TODO: escape double quotes
	#if not (props and 'link' in props) and is_local(filename):
		#line = '"' + to_url(filename) + '"'
	#else:
		#line = '"' + filename + '"'
	line = '"' + to_url(filename) + '"'

	if props:
		# alias
		# TODO: escape double quotes
		line = line + ',{'
		for k,v in props.items():
			line = line + '"' + k + '":'
			if type(v) == list:
				line = line + str(v) + ','
			else:
				line = line + '"' + v + '",'
		line = line + '}'
		line = '[' + line + ']'

	# end item line
	line = line + ",\n"

	return line
#}}}

def is_local(filename):#{{{
	global re_remote

	return re_remote.search(filename) == None
#}}}

def find_items(files):#{{{
	""" return unfiltered list of items from specified directories """
	global gdir

	abs_gdir = os.path.abspath(gdir)

	# find items in "files" directory
	for ff in files:
		# return remote file name
		if not is_local(ff):
			yield ff
			continue
		# recursively look for other files
		for f in walk(ff):
			abs_f = os.path.abspath(f)
			# ignore gallery generated directories
			if abs_f.startswith(abs_gdir+S+"files"+S) or \
			   abs_f.startswith(abs_gdir+S+"items"+S) or \
			   abs_f.startswith(abs_gdir+S+"thumbs"+S):
				continue

			yield f
#}}}

# item type#{{{
class Type:
	UNKNOWN = 0
	IMAGE = 1
	FONT  = 2
	VIDEO = 3

def item_type(f):
	global re_img, re_font, re_vid

	if re_img.search(f) != None:
		return Type.IMAGE
	if re_font.search(f) != None:
		return Type.FONT
	if re_vid.search(f) != None:
		return Type.VIDEO

	return Type.UNKNOWN
#}}}

def create_gallery(files):#{{{
	"""
	finds all usable items in specified files/directories (argument),
	copy items to "items/" (if --local not set),
	write font-faces into css OR render fonts,
	return items
	"""
	global re_img, re_font, re_vid, gdir

	items = {}
	imgdir = gdir+S+"items"
	cssfile = codecs.open( gdir +S+ "fonts.css", "w", "utf-8" )

	# find items in input files/directories
	for f in find_items(files):
		# filetype (image, font, audio/video)
		t = item_type(f)

		if t>0:
			# file is local and not viewed locally
			if not local and is_local(f):
				destdir = dirname(f)
				basename = os.path.basename(f)
				fdir = imgdir +S+ destdir
				if not os.path.isdir(fdir):
					os.makedirs(fdir)
				cp( os.path.abspath(f), fdir +S+ basename )
				f = "items" +S+ (destdir and destdir+S or "") + os.path.basename(f)

			# item properties
			props = {}

			# if file is font: create font-face line in css or render it
			if t == Type.FONT:
				f, alias, link = addFont(f, cssfile)
				if alias:
					props['alias'] = alias
				if link:
					props['link'] = to_url(link)

			items[f] = props

	cssfile.close()

	return items
#}}}

def create_thumbnail(filename, resolution, outfile):#{{{
	# create directory for output file
	d = dirname(outfile)
	if not os.path.exists(d):
		os.makedirs(d)

	im = Image.open(filename)

	# better scaling quality when image is in RGB or RGBA
	if not im.mode.startswith("RGB"):
		im = im.convert("RGB")

	# scale and save
	im.thumbnail( (resolution,resolution), Image.ANTIALIAS )
	im.save( outfile + ".png", "PNG", quality=60 )

	return im.size
#}}}

def create_thumbnails(items):#{{{
	global local, resolution, force, gdir

	thumbdir = gdir+S+"thumbs"

	images = [img for img in filter(re_img.search, items.keys())]

	# number of images
	n = len(images)
	if n == 0:
		return # no images

	# create thumbnail directory
	os.makedirs(thumbdir)

	i = 0
	bar = ">" + (" "*progress_len)
	sys.stdout.write( "Creating thumbnails: [%s] %d/%d\r"%(bar,0,n) )

	lines = "var ls=[\n"
	for f in sorted( images, key=lambda x: x.lower() ):
		w = h = 0
		try:
			if 'link' in items[f]:
				# use rendered image in '<gallery>/items/<filename>.png'
				infile = gdir +S+ f.replace(':','_')
				if local:
					outfile = thumbdir +S+ f.replace(':','_')
				else:
					outfile = thumbdir +S+ f.replace(':','_')
			else:
				if not local and is_local(f):
					infile = gdir +S+ f.replace(':','_')
				else:
					infile = os.path.abspath(f)
				outfile = thumbdir +S+ to_url(f).replace(':','_')

			w,h = create_thumbnail(infile, resolution, outfile)
			items[f]['thumbnail_size'] = [w,h]
		except Exception as e:
			print("ERROR: "+str(e)+" (file: \""+f+"\")")

		# show progress bar
		i=i+1
		l = int(i*progress_len/n)
		bar = ("="*l) + ">" + (" "*(progress_len-l))
		sys.stdout.write( "Creating thumbnails: [%s] %d/%d%s"%(bar,i,n,i==n and "\n" or "\r") );
		sys.stdout.flush()

	print("Thumbnails successfully generated.")
#}}}

def thumbnail_size(filename, resolution):#{{{
	""" return same resolution as Image.thumbnail() """
	try:
		im = Image.open(filename)
		w,h = im.size
		if w>h:
			if w>resolution:
				h = h*resolution/w
				w = resolution
		else:
			if h>resolution:
				w = w*resolution/h
				h = resolution

		return [w,h]
	except:
		return [0,0]
#}}}

def write_items(items):#{{{
	itemfile = codecs.open( gdir +S+ "items.js", "w", "utf-8" )
	itemfile.write('var title = "'+title+'";\n');
	itemfile.write("var ls=[\n")
	for item in sorted( items, key=lambda x: x.lower() ):
		itemfile.write( from_locale(itemline(item, items[item])) )
	itemfile.write("];\n");
	itemfile.close()
#}}}

def main(argv):#{{{
	global title, resolution, gdir, url, d, force

	# arguments
	files = parse_args(argv)

	# clean gallery directory
	clean_gallery()

	items = create_gallery(files)

	# no usable items found
	if not items:
		print("No items in gallery!")
		exit(1)

	# open browser?
	if url:
		# write items.js so we can open it in browser
		write_items(items)
		launch_browser(url)

	if resolution:
		create_thumbnails(items)

	if not url or resolution:
		write_items(items)

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv[1:])

