#!/usr/bin/python
"""
Creates web gallery of images and fonts present in current directory
"""
import os, sys, re, getopt, shutil, glob
S = os.sep
# default values:
title="default" # html title and gallery directory name
resolution = 300 # thumbnail resolution
d = os.path.dirname(sys.argv[0]) or "." # path to template
home = os.environ.has_key('HOME') and os.environ['HOME'] or os.environ['HOMEDRIVE']+os.environ['HOMEPATH']+S+"My Documents"
gdir = home +S+ "Galleries" +S+ "%s"; # path to gallery
url = "file:///<path_to_gallery>/index.html" # browser url
progress_len = 40 # progress bar length

force = False # don't delete files

rm_error = "ERROR: Existing gallery contains files that aren't symbolic links!\n"+\
          "       Use -f (--force) to remove all files."

import_error = "WARNING: Generating {0} was unsuccessfull! To generate {0} Python Imaging Library needs to be installed."

re_img  = re.compile('\.(jpg|png|gif|svg)$',re.I)
re_font = re.compile('\.(otf|ttf)$',re.I)
re_vid = re.compile('\.(mp4|mov|flv|ogg|mp3|wav)$',re.I)
re_remote = re.compile('^\w+://',re.I)
re_fontname = re.compile('[^a-zA-Z0-9_]')

local = False

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

def escape(s):#{{{
	return s.replace('\\','/').replace('"','\\"')
#}}}

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

    -r 0, --resolution=0    don't generate thumbnails
    -u "", --url=""         don't launch web browser
"""	% (sys.argv[0], title, gdir, d, url, resolution) )
#}}}

def dirname(filename):#{{{
	return os.path.dirname(filename).replace(':','_')
#}}}

def path(filename, dir='items'):#{{{
	global local

	if local:
		return 'file://'+os.path.abspath(filename).replace('\\','/')
	else:
		return dir+'/'+filename.replace(':',"_").replace('\\','/')
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
		if webbrowser.open(url):
			ok = True;
	except:
		pass;

	print(ok and "DONE" or "FAILED!")
#}}}

def parse_args(argv):#{{{
	global title, resolution, gdir, url, d, cp, force, local

	try:
		opts, args = getopt.getopt(argv, "ht:r:d:u:cfl",
				["help", "title=", "resolution=", "directory=", "url=","template=","copy","force","local"])
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
			except:
				exit("ERROR: Resolution must be single number!")
		elif opt in ("-c", "--copy"):
			cp = copy
		elif opt in ("-l", "--local"):
			local = True
		elif opt in ("-f", "--force"):
			force = True

	try:    gdir = gdir % title
	except: pass

	if newurl != None:
		url = newurl
	else:
		url = "file://"+ os.path.abspath(gdir) + "/index.html"

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

		# omit item directory when creating local gallery
		if not local:
			os.mkdir(itemdir)

		shutil.copyfile(d+S+"config.js", gdir+S+"config.js")
	except:
		raise
#}}}

def addFont(fontfile,css):#{{{
	global re_fontname

	fontname = ""

	try:
		from PIL import ImageFont

		font = ImageFont.truetype(fontfile,8)
		name = font.getname()
		fontname = name[0]
		if name[1]:
			fontname = fontname + " " + name[1]
	except ImportError:
		pass
	except Exception as e:
		print("ERROR: "+str(e)+" (file: \""+fontfile+"\")")

	p = path(fontfile)
	css.write("@font-face{font-family:"+re_fontname.sub("_",p)+";src:url('"+p+"');}\n")

	return fontname
#}}}

def itemline(filename,alias=None,width=None,height=None):#{{{
	# filename
	# TODO: escape double quotes
	line = '"' + ( is_local(filename) and path(filename) or filename ) + '"'

	if alias or width:
		# alias
		# TODO: escape double quotes
		line = line + ',{' + ( alias and ('alias:"'+alias+'"') or '' ) + '}'

		# width and height
		if width:
			line = line + ','+str(width)+','+str(height)

		line = '[' + line + ']'

	# end item line
	line = line + ",\n"

	return line
#}}}

def is_local(filename):#{{{
	return re_remote.search(filename) == None
#}}}

def prepare_html(template,itemfile,css,gdir,files):#{{{
	global re_img, re_font, re_vid

	items = {}
	imgdir = gdir+S+"items"
	abs_gdir = os.path.abspath(gdir)

	# find items in "files" directory
	for ff in files:
		for f in walk(ff):
			abs_f = os.path.abspath(f)
			# ignore gallery generated directories
			if abs_f.startswith(abs_gdir+S+"files"+S) or \
			   abs_f.startswith(abs_gdir+S+"items"+S) or \
			   abs_f.startswith(abs_gdir+S+"thumbs"+S):
				continue

			# filetype (image, font, audio/video)
			isimg = isfont = isvid = False
			isimg = re_img.search(f) != None
			if not isimg:
				isfont = re_font.search(f) != None
				if not isfont:
					isvid = re_vid.search(f) != None

			if isimg or isfont or isvid:
				if is_local(f):
					fdir = imgdir+S+dirname(f)
					if not os.path.isdir(fdir):
						os.makedirs(fdir)
					if not local:
						cp( abs_f, fdir +S+ os.path.basename(f) )

				# if file is font: create font-face line in css
				alias = ""
				if isfont:
					alias = addFont(f,css);

				items[escape(f)] = alias

	itemfile.write('var title = "'+title+'";\n');
	itemfile.write("var ls=[\n")
	for item in sorted(items,key=str.lower):
		alias = items[item]
		itemfile.write( itemline(item,alias) )
	itemfile.write("];\n");

	return items
#}}}

def create_thumbnail(filename, resolution, outfilename):#{{{
	from PIL import Image

	# create directory for output file
	d = dirname(outfilename).replace(':','_')
	if not os.path.exists(d):
		os.makedirs(d)

	im = Image.open(filename)

	# better scaling quality when image is in RGB or RGBA
	if not im.mode.startswith("RGB"):
		im = im.convert("RGB")

	# scale and save
	im.thumbnail((resolution,resolution), Image.ANTIALIAS)
	im.save(outfilename + ".png", "PNG", quality=60)

	return im.size
#}}}

def create_thumbnails(items, imgdir, thumbdir, resolution, itemfile):#{{{
	global local

	# number of images
	n = sum( 1 for _ in filter(re_img.search,items.keys()) )
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
		w = h = 0
		if re_img.search(f):
			try:
				if local:
					w,h = create_thumbnail( os.path.abspath(f), resolution,
							thumbdir +S+ path(f).replace(':','_') )
				else:
					w,h = create_thumbnail( os.path.abspath(f), resolution, path(f,thumbdir) )
			except ImportError:
				pass
			except Exception as e:
				print("ERROR: "+str(e)+" (file: \""+f+"\")")

			# show progress bar
			i=i+1
			l = int(i*progress_len/n)
			bar = ("="*l) + ">" + (" "*(progress_len-l))
			sys.stdout.write( "Creating thumbnails: [%s] %d/%d%s"%(bar,i,n,i==n and "\n" or "\r") );
			sys.stdout.flush()
		lines = lines + itemline(f,alias,w,h)
	lines = lines + "];\n"

	# rewrite items.js
	itemfile.seek(0)
	itemfile.truncate()
	itemfile.write('var title = "'+title+'";\n');
	itemfile.write(lines)

	print("Thumbnails successfully generated.")
#}}}

def main(argv):#{{{
	files,title,resolution,gdir,url,d,force = parse_args(argv)

	prepare_gallery(d,gdir,force)

	template = open( d+S+"template.html", "r" );
	itemfile = open( gdir+S+"items.js", "w" )
	css = open( gdir+S+"fonts.css", "w" )

	items = prepare_html(template,itemfile,css,gdir,files)

	# no usable items found
	if not items:
		print("No items in gallery!")
		exit(1)

	template.close()
	css.close()

	if url:
		itemfile.flush()
		launch_browser(url)

	thumbdir = gdir+S+"thumbs"
	if os.path.isdir(thumbdir):
		shutil.rmtree(thumbdir)
	if resolution>0:
		create_thumbnails(items, gdir+S+"items", thumbdir, resolution, itemfile)

	itemfile.close()

	print("New gallery was created in: '"+gdir+"'")
#}}}

if __name__ == "__main__":
	main(sys.argv[1:])

