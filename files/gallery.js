/*
 * \section caching Caching
 * \par
 * When opened (on any item) the gallery browser should use cache only to store the currently viewed item (i.e. item list is not created and no items are preloaded).
 *
 * \par
 * Navigating to another image will preload images. The number of preloaded images is at most the value of config['preload_images'] (user defined; zero if not defined).
 *
 * \see preloadImages
 *
 *\par
 * When the item list is opened for the first time, it starts to load thumbnails. User needs to reopen the item list to refresh thumbnails which weren't loaded yet.
 *
 * see: ItemList::toggle
 *
 */

/*jslint evil: true, forin: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, newcap: true, immed: true, strict: true */
/*global $, jQuery, window, document, navigator, location, history, escape, alert, Image*/

"use strict";
Function.prototype.bind = function(thisObj, var_args) {
  var self = this;
  var staticArgs = Array.prototype.splice.call(arguments, 1, arguments.length);

  return function() {
    var args = staticArgs.concat();
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    return self.apply(thisObj, args);
  };
}
if ( window.console ) {
    var log = window.console.log.bind(window.console);
}

// DEFAULT CONFIGURATION {{{
// option: [default value, category, description]
// character after underscore in description is keyboard shortcut
var configs = {
    'allow_drop': [true, "General", "Allow drag-n-drop new files to gallery"],
	'no_preview': [false, "General", "Disable item _preview window"],
	'no_list': [false, "General", "Disable item _list"],
	'no_info': [false, "General", "Disable item _info"],
	'title_fmt': ['%{title}: %{now}/%{max} "%{filename}"' ,"General", "_Title format (keywords: title, filename, now, max, remaining)"],
	'pop_info_delay': [4000, "General", "Info pop up _delay (in milliseconds)"],
	'slide_scroll': [100, "General", "Slide scroll _amount"],
    'shuffle': [false, "General", "Randomly _shuffle gallery items"],

	'font_size': [16, "Font", "_font size"],
	'font_thumbnail_text': ['+-1234567890,<br/>abcdefghijklmnopqrstuvwxyz,<br/>ABCDEFGHIJKLMNOPQRSTUVWXYZ', "Font", "Font t_humbnail text (HTML)"],
	'font_test': ['+-1234567890, abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, ?!.#$\\/"\'', "Font", "Te_xt for fonts"],

	'zoom': ['1', "Images", "Default _zoom level"],
	'zoom_step': [0.125, "Images", "Z_oom multiplier"],
	'preload_images': [2, "Images", "Number of images to pr_eload"],
    'image_on_canvas': [false, "Images", "Use HTML5 _canvas element to draw images"],
    'max_preview_width': [15, "Images", "Maximal preview _width in percent of window width"],
    'max_preview_height': [80, "Images", "Maximal preview _height in percent of window height"],
	'pop_preview_delay': [1000, "Images", "Preview pop up delay (in milliseconds)"],

    'slideshow': [false, "Slideshow", "Slideshow mode"],
	'slideshow_delay': [8000, "Slideshow", "Slideshow delay"],

	'progress_fg': ["rgba(255,200,0,0.8)", "Progress bar appearance", "foreground color"],
	'progress_bg': ["rgba(200,200,200,0.4)", "Progress bar appearance", "background color"],
	'progress_radius': [22, "Progress bar appearance", "Radius"],
	'progress_width': [8, "Progress bar appearance", "Circle stroke width (background)"],
	'progress_inner_width': [8, "Progress bar appearance", "Circle stroke width (foreground)"],
	'progress_shadow': [10, "Progress bar appearance", "Shadow size"],
	'progress_blur': [10, "Progress bar appearance", "Blur amount"],

	'thumbnail_max_width': [300, "Thumbnail", "Maximum width"],
    'use_svg_thumbnails': [false, "Thumbnail", "Use original vector image as thumbnail (can be slow)"],
    'max_page_items': [0, "Thumbnail", "Maximum number of items on page"],

	'autoplay': [false, "Audio/Video", "Pla_y audio/video when viewed"],
	'autonext': [false, "Audio/Video", "Go to _next item whed playback ends"],
	'loop': [false, "Audio/Video", "_Replay when playback ends"],

    'reload_every': [0, "Debug", "N_umber of items to view after the gallery if refreshed"],
	'show_keys': [false, "Debug", "Show pressed keys in info"],
	'show_events': [false, "Debug", "Show events in info"],

	'n': [1, ""]
}//}}}

// CLASSES//{{{
// drag scrolling
var scrolling = false;

// user storage
var storage;

function esc (str) {//{{{
	// escape hash and question mark in filenames
	// (jQuery won't escape them)
	return str.replace(/#/g,'%23').replace(/\?/g,'%3F');
}//}}}

function createPathElements(dir_e, filename_e, ext_e, path) {//{{{
    var m, dir, filename;

    if( path.search(/^data:[a-z]+\/[a-z]+;/) > -1 ) {
        filename_e.hide();
        dir_e.hide();
        ext_e.hide();
        return;
    }

    if ( path.search(/^\$\(/) > -1 ) {
        dir_e.hide();
        filename_e.hide();
        ext_e.hide();
        return;
    }

    m = path.lastIndexOf("/");
    if ( m === -1 ) {
        m  = path.lastIndexOf("\\");
    }

    // directory
    dir = path.substring(0,m);
    if (dir_e.length) {
        dir = dir.replace(/^items\/?/,'');
        if (dir) {
            dir_e.html(dir);
            dir_e.show();
        } else {
            dir_e.hide();
        }
    }

    filename = path.substring(m+1,path.length);

    m = filename.lastIndexOf(".");

    // filename
    if (filename_e.length) {
        filename_e.html( filename.substring(0,m) );
        filename_e.show();
    }

    // extension
    if (ext_e.length) {
        ext_e.html( filename.substring(m+1,filename.length) );
        ext_e.show();
    }
}//}}}

// disable/enable keyboard shortcuts//{{{
var keysdisabled = false;
var onescapekeysdisabled;

function disableKeys (onescape)
{
    keysdisabled = true;
    onescapekeysdisabled = onescape;
}

function enableKeys ()
{
    keysdisabled = false;
    onescapekeysdisabled = null;
}
//}}}

//! \class Items
//{{{
var Items = function (ls, max_page_items) { this.init(ls, max_page_items); };

Items.prototype = {
init: function (ls, max_page_items)//{{{
{
	var items, item, i, len, pg;

    this.ls = [];
    this.pages = 1;
	for(i=0, len=0; i<ls.length; i+=1) {
		item = ls[i];

		// empty filename means page break
		if( !item ||
                (max_page_items > 0 && (i+1)%max_page_items == 0) ||
                (item instanceof Array && (!item.length || !item[0])) ) {
			++this.pages;
			continue;
		}

		// insert item
		if (!item instanceof Array) {
			item = [item,{}];
		} else if (item.length < 2) {
			item.push({});
		}
        this.add(item[0], item[1]);
	}
	this.len = len;
},//}}}

length: function()//{{{
{
	return this.ls.length;
},//}}}

get: function(i)//{{{
{
    var res, key;

    if ( i < this.length() ) {
        res = this.ls[i];
        if ( storage && res[0].search(/^data:[a-z]+\/[a-z]+;/) === 0 ) {
            // get data URL from localStorage
            key = res[0].split(';:');
            return [storage[key[1]], res[1]];
        } else {
            return res;
        }
    } else {
        return ['', {}];
    }
},//}}}

page: function(i)//{{{
{
	if ( i>=0 && i<this.length() ) {
		return this.ls[i][1].page_;
	}
	return -1;
},//}}}

shuffle: function ()//{{{
{
    var tmp, ls, i, j;

    i = this.length();
    ls = this.ls;
    while(i>0) {
        j = Math.floor( Math.random() * i );
        i -= 1;
        tmp = ls[j];
        ls[j] = ls[i];
        ls[i] = tmp;
    }
},//}}}

add: function (url, props)//{{{
{
    var p = props ? props : {};
    p.page_ = this.pages;

    this.ls.push( [url, p] );
}//}}}

};
//}}}

//! \interface ItemView
//{{{
/**
 * \fn init(itempath, parent)
 * \param itempath item filename
 * \param parent item parent (Viewer)
 *
 * \fn type()
 * \return an identifier of type (e.g. "image", "font")
 *
 * \fn show()
 * \return shows view in parent
 *
 * \fn remove()
 * \return removes view from parent
 *
 * \fn thumbnail()
 * \brief triggers event thumbnailOnLoad() after thumbnail loaded
 * \return an element representing the thumbnail of item
 *
 * \fn zoom(how)
 * \param how "fit" (fit to window), "fill" (fill window), float (zoom factor), other (do nothing)
 * \return current zoom factor
 *
 * \fn onZoomChange()
 * \brief event
 */
//}}}

//! \class ImageView
//! \implements ItemView
//{{{
var ImageView = function (imgpath, parent) { this.init(imgpath, parent); };

ImageView.prototype = {
init: function (imgpath, parent)//{{{
{
    this.path = imgpath;
    this.parent = parent;
},//}}}

type: function ()//{{{
{
    return "image";
},//}}}

show: function ()//{{{
{
    var view, e, use_canvas, use_embed;
    view = this;

    if ( this.e ) {
        return;
    }

    this.parent.onUpdateStatus("loading");

    // don't use canvas in some cases:
    //  - user configuration
    //  - GIF: redraw animated images in intervals
    use_canvas = this.parent.getConfig('image_on_canvas') &&
        this.path.search(/\.gif$/i) === -1;

    if ( !use_canvas ) {
        e = this.e = this.img = $("<img>");
        this.ctx = {
            drawImage: function (img,x,y,width,height) {
                           if( !e.attr("src") ) {
                               e.attr( "src", esc(img.src) );
                           }
                           e.width = width;
                           e.height = height;
                       }
        };
    } else {
        e = this.e = $("<canvas>");
        this.ctx = this.e[0].getContext('2d');
    }

    e.css("display","block");
    e.addClass("imageview");
    e.appendTo(this.parent.e);

    // image element
    if ( !this.img && !use_embed ) {
        e = this.img = $("<img>");
    }
    if ( !use_embed ) {
        e.load( function () {
            view.parent.onUpdateStatus(null);

            view.orig_width = view.width = this.width ? this.width : this.naturalWidth;
            view.orig_height = view.height = this.height ? this.height : this.naturalHeight;

            view.onLoad();
        } );
    }
    e.attr( "src", esc(this.path) );
},//}}}

remove: function ()//{{{
{
    var e = this.e;
    if (e) {
        e.remove();
    }
},//}}}

thumbnail: function ()//{{{
{
    if ( !this.thumb ) {
        var thumbpath, thumb, t;
        thumbpath = this.path.replace(/:/g,'_');
        if ( !getConfig('use_svg_thumbnails') || this.path.search(/\.svg$/i) == -1 ) {
            thumbpath = "thumbs/" + thumbpath + ".png";
        }

        thumb = this.thumb = $("<img>", {'class': "thumbnail " + this.type()});

        thumb.load(this.thumbnailOnLoad);
        thumb.error( this.thumbnailOnLoad.bind(this, true) );
        thumb.attr( "src", esc(thumbpath) );
    }

    return this.thumb;
},//}}}

zoom: function (z)//{{{
{
    var w, h;

    if (!z) {
        return this.width/this.orig_width;
    }

    w = this.orig_width;
    h = this.orig_height;

    // clear canvas
    if(this.width && this.ctx.clearRect) {
        this.ctx.clearRect(0,0,this.width,this.height);
    }

    this.width = this.e[0].width = w*z;
    this.height = this.e[0].height = h*z;

    // redraw image
    this.ctx.drawImage(this.img[0],0,0,this.width,this.height);
    this.zoom_factor = z;

    this.parent.onUpdateStatus( w+"x"+h, ".resolution" );
    this.parent.onUpdateStatus( z===1 ? null : Math.floor(z*100), ".zoom" );

    this.parent.center();

    return this.width/this.w;
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after view is loaded
 */
onLoad: function (){},

/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 * \param error true if error occured
 */
thumbnailOnLoad: function (error){}
};
//}}}

//! \class VideoView
//! \implements ItemView
//{{{
var VideoView = function (vidpath, parent) { this.init(vidpath, parent); };

VideoView.prototype = {
init: function (vidpath, parent)//{{{
{
    this.path = vidpath;
    this.parent = parent;
    this.zoom_factor = 1;
},//}}}

type: function ()//{{{
{
    return "video";
},//}}}

show: function ()//{{{
{
    var view, e, p;
    view = this;
    p = this.parent;

    if ( this.e ) {
        return;
    }

    p.onUpdateStatus("loading");

	e = this.e = $('<video>');
	e.html("Your browser does not support the video tag.");
    e.attr("controls","controls");
    e.css("display","block");
    e.addClass("videoview");
    e.attr("id","video");

	if ( p.getConfig('autoplay') ) {
		e.attr("autoplay","autoplay");
    }
	if ( p.getConfig('loop') ) {
		e.attr("loop","loop");
    }
	if ( p.getConfig('autonext') ) {
		e.bind( "ended", function () {p.onNext();} );
    }

    e.bind('canplay', function () {
        var s, m;

        view.parent.onUpdateStatus(null);

        view.orig_width  = view.width = this.videoWidth;
        view.orig_height = view.height = this.videoHeight;
		view.duration = this.duration/60;
		s = Math.floor(this.duration);
		m = Math.floor(s/60);
		s = ""+(s-m*60);
		view.duration = m+":"+(s.length === 1 ? "0" : "")+s;

        view.onLoad();
    } );
    e.error( this.parent.onUpdateStatus.bind( this.parent, "Unsupported format!", ".error" ) );

    e.attr( "src", esc(this.path) );
    e.appendTo(this.parent.e);
},//}}}

remove: function ()//{{{
{
    var e = this.e;
    if ( e ) {
        e.remove();
    }
},//}}}

thumbnail: function ()//{{{
{
    var thumb = this.thumb;

    if ( !thumb ) {
        thumb = this.thumb = $( document.createElement("div") );
        thumb.addClass("thumbnail " + this.type());

        this.thumbnailOnLoad();
    }

    return thumb;
},//}}}

zoom: function (z)//{{{
{
    var w,h,ww,wh;

    if (!z) {
        return this.width/this.orig_width;
    }

    w = this.orig_width;
    h = this.orig_height;

    if(!w) {
        ww = window.innerWidth;
        wh = window.innerHeight;
		this.width = this.e[0].width = ww;
		this.height = this.e[0].height = wh/2;
        this.updateStatus();
		return;
	}

    this.width = this.e[0].width = w*z;
    this.height = this.e[0].height = h*z;
    this.zoom_factor = z;

    this.updateStatus();

    this.parent.center();

    return this.width/this.orig_width;
},//}}}

updateStatus: function ()//{{{
{
    // resolution
    this.parent.onUpdateStatus( this.orig_width+"x"+this.orig_height, ".resolution" );

    // zoom
    this.parent.onUpdateStatus( this.zoom_factor !== 1 ? null : Math.floor(this.zoom_factor*100), ".zoom" );

    // playback speed
    this.parent.onUpdateStatus(
            this.e[0].playbackRate === 1.0 ? null : Math.round(this.e[0].playbackRate*100)/100,".speed" );

    // duration
    this.parent.onUpdateStatus(this.duration, ".duration");
},//}}}

normalSpeed: function ()//{{{
{
    this.e[0].playbackRate = 1;
    this.updateStatus();
},//}}}

faster: function ()//{{{
{
    this.e[0].playbackRate += 0.1;
    this.updateStatus();
},//}}}

slower: function ()//{{{
{
    this.e[0].playbackRate -= 0.1;
    this.updateStatus();
},//}}}

togglePlay: function ()//{{{
{
    if ( this.e[0].paused ) {
        this.e[0].play();
    } else {
        this.e[0].pause();
    }
},//}}}

seek: function (how) {//{{{
    this.e[0].currentTime += how;
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after view is loaded
 */
onLoad: function (){},
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 */
thumbnailOnLoad: function () {}
};
//}}}

//! \class FontView
//! \implements ItemView
//{{{
var FontView = function (itempath, parent) { this.init(itempath, parent); };

FontView.prototype = {
init: function (itempath, parent)//{{{
{
    this.path = itempath;
    this.parent = parent;
    this.zoom_factor = 1;
    this.font = this.path.replace(/[^a-zA-Z0-9_]+/g,'_');
	this.width = this.height = 0;
},//}}}

type: function ()//{{{
{
    return "font";
},//}}}

show: function ()//{{{
{
    var e, view;

    if (this.e) {
        return;
    }

    e = this.e = $( document.createElement("textarea") );
    e.attr( "src", esc(this.path) );
    e.addClass("fontview");

    e.attr( "value", this.parent.getConfig('font_test') );
    e.css("font-family",this.font);

    // disable keyboard navigation when textarea focused
    view = this;
    e.focus( function () {
        disableKeys( e.blur.bind(e) );
    } );
    e.blur( function () {
        view.parent.onFontTextChange(this.value);
        enableKeys();
        view.updateHeight();
    } );

    e.appendTo(this.parent.e);

    this.onLoad();
},//}}}

remove: function ()//{{{
{
    var e = this.e;
    if (e) {
        e.remove();
    }
},//}}}

thumbnail: function ()//{{{
{
    var thumb = this.thumb;

    if ( !thumb ) {
        thumb = this.thumb = $('<div>', {'class': "thumbnail " + this.type(), html: this.parent.getConfig('font_thumbnail_text')});
        thumb.css("font-family",this.font);

        this.thumbnailOnLoad();
    }

    return thumb;
},//}}}

zoom: function (how)//{{{
{
    var orig, z, zz;
    orig = this.parent.getConfig('font_size');

    if (!this.orig_height) {
        this.orig_height = this.e.offsetHeight;
    }

    z = this.zoom_factor;
    zz = Math.ceil(z*orig);

    switch(how) {
    case "+":
        zz += 1;
        z = zz/orig;
        break;
    case "-":
        zz -= 1;
        z = zz/orig;
        break;
    default:
        z = parseFloat(how);
        if (!z) {
            z = 1;
        }
        zz = Math.ceil(z*orig);
        break;
    }

    this.e.css("font-size",zz+"pt");
    this.updateHeight();

    this.zoom_factor = z;

    this.parent.center();

    // for firefox this.e.css("font-size") is "...px" not "pt"
    this.parent.onUpdateStatus( this.e[0].style.fontSize, ".fontsize" );
},//}}}

updateHeight: function ()//{{{
{
    var view, e;
    // FIXME: better solution
    view = this;
    e = this.e;
    e.hide();
    e.css("height","50%");
    window.setTimeout(
        function (){
            e.show();
            e.css("height",e[0].scrollHeight+"px");
            view.parent.center(e.innerHeight());
        },10);
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after view is loaded
 */
onLoad: function (){},
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 */
thumbnailOnLoad: function (){}
};
//}}}

//! \class HTMLView
//! \implements ItemView
//{{{
var HTMLView = function (itempath, parent) { this.init(itempath, parent); };

HTMLView.prototype = {
init: function (itempath, parent)//{{{
{
    this.path = itempath;
    this.parent = parent;
	this.width = this.height = 0;
},//}}}

type: function ()//{{{
{
    return "html";
},//}}}

show: function ()//{{{
{
    var e, view;
	view = this;
    p = this.parent;

    if (this.e) {
        return;
    }

    p.onUpdateStatus("loading");

    e = this.e = $('<iframe>', {
      'class': 'htmlview',
      'seamless': 'yes',
      //'scrolling': 'no',
      'src': esc(this.path)
    });

    e.appendTo(p.e);

	e.load( function () {
		p.onUpdateStatus(null);

		view.orig_width = view.width = this.width ? this.width : this.naturalWidth;
		view.orig_height = view.height = this.height ? this.height : this.naturalHeight;

		view.onLoad();
	} );
},//}}}

remove: function ()//{{{
{
    var e = this.e;
    if (e) {
        e.remove();
    }
},//}}}

thumbnail: function ()//{{{
{
    var thumb = this.thumb;

    if ( !thumb ) {
        thumb = this.thumb = $( document.createElement("div") );
        thumb.addClass("thumbnail " + this.type());

        this.thumbnailOnLoad();
    }

    return thumb;
},//}}}

zoom: function (how)//{{{
{
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after view is loaded
 */
onLoad: function (){},
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 */
thumbnailOnLoad: function (){}
};
//}}}

//! \class TagView
//! \implements ItemView
//{{{
var TagView = function (tag, parent) { this.init(tag, parent); };

TagView.prototype = {
init: function (tag, parent)//{{{
{
    var e, m, props, i, tagname;

    // parse tagname and properties
    // format: $([.#]tagname)(['prop',val])*
    m = tag.match(/^\$\((<[^)]*)\)\s*$/);
    if (!m) {
        this.error = true;
        return;
    }

    // tag name
    e = this.e = $(m[1]);
    if (!e.length) {
        this.error = true;
        return;
    }

    this.parent = parent;
},//}}}

type: function ()//{{{
{
    return "tag";
},//}}}

show: function ()//{{{
{
    var e, props, p, ee, view, added;

    e = this.e;
    props = this.props;
    p = this.parent;

    p.onUpdateStatus("loading");

    e.appendTo(p.e);

    e.show();

    this.orig_width = e.width();
    this.orig_height = e.height();

    p.onUpdateStatus(null);

    this.onLoad();
},//}}}

remove: function ()//{{{
{
    var e, props;

    e = this.e;
    if (e) {
        e.remove();
    }
},//}}}

thumbnail: function ()//{{{
{
    var thumb = this.thumb;

    if ( !thumb ) {
        thumb = this.thumb = $('<div>', {'class': 'thumbnail ' + this.type()});
        this.thumbnailOnLoad();
    }

    return thumb;
},//}}}

zoom: function (how)//{{{
{
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after view is loaded
 */
onLoad: function (){},
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 */
thumbnailOnLoad: function (){}
};
//}}}

//! \class ViewFactory
//{{{
var ViewFactory = function (parent) {
    this.init(parent);
};

ViewFactory.prototype = {
init: function (parent) {//{{{
      this.parent = parent;
},//}}}

newView: function (filepath) {//{{{
     var view;

    if (filepath.search(/\.(png|jpg|gif|svg)$|^data:image\/[a-z]+;/i) > -1) {
        view = new ImageView(filepath, this.parent);
    } else if (filepath.search(/\.(ttf|otf)$/i) > -1) {
        view = new FontView(filepath, this.parent);
    } else if (filepath.search(/\.(mp4|mov|flv|ogg|mp3|wav)$/i) > -1) {
        view = new VideoView(filepath, this.parent);
    } else if (filepath.search(/\.html$/i) > -1) {
        view = new HTMLView(filepath, this.parent);
    } else if (filepath.search(/^\$\(<.*\)$/) > -1) {
        view = new TagView(filepath, this.parent);
    } else {
        view = {error:true};
    }
    return view.error ? null : view;
}//}}}
};
//}}}

//! \class Viewer
//{{{
var Viewer = function (e, preview, getConfig) {
    this.init(e, preview, getConfig);
};

Viewer.prototype = {
init: function (e, preview, getConfig)//{{{
{
    var t, img, win, mousedown;

    t = this;
    this.e = e;
    e.mousedown( function (ev){
                if (ev.button === 0 && t.view) {
                    var fn = t.view.type()+'OnMouseDown';
                    if ( t[fn] ) {
                        t[fn]();
                        ev.preventDefault();
                    }
                }
            } );

    if (preview) {
        this.preview = preview;

		img = this.preview_img = $('<img>');
		img.appendTo(preview);

        win = this.preview_win = $('<div>', {'class':'window'});
        win.css("position", "absolute");
		win.appendTo(preview);

		mousedown = function (ev){
			if (ev.button === 0 && t.previewOnMouseDown) {
				t.previewOnMouseDown();
				ev.preventDefault();
			}
		};
        win.mousedown(mousedown);
        img.mousedown(mousedown);
    }

    this.zoom_state = getConfig('zoom');

    this.getConfig = getConfig;

    this.viewFactory = new ViewFactory(this);
},//}}}

zoom: function (how)//{{{
{
    var v, ww, wh, w, h, z, zs, zoom_state, type;

    v = this.view;
    if ( !v ) {
        return;
    }

    // if how is not set -- restore the original
    if (!how) {
        how = this.zoom_state;
    }

    // treat font/html zoom differently
	type = v.type();
    if( type === 'font' || type === 'html' ) {
        v.zoom(how);
        return;
    }

	ww = window.innerWidth;
	wh = window.innerHeight;
    w = v.orig_width;
    h = v.orig_height;
    z = v.zoom();
    zs = this.getConfig('zoom_step');

    // determine zoom factor
    switch(how) {
    case "+":
        if ( z*0.8 > zs ) {
            z += zs;
        } else {
            // round to 3 decimal places
            z = Math.round(1000*z*5/4)/1000;
        }
        zoom_state = z;
        break;
    case "-":
        if ( z*0.8 > zs ) {
            z -= zs;
        } else {
            // round to 3 decimal places
            z = Math.round(1000*z*4/5)/1000;
        }
        zoom_state = z;
        break;
    case "fit":
		if (w > ww || h > wh) {
			z = ( ww*h < wh*w ) ? ww/w : wh/h;
        } else {
			z = 1;
        }
        zoom_state = how;
        break;
    case "fill":
        z = ( ww*h < wh*w ) ? wh/h : ww/w;
        zoom_state = how;
        break;
    default:
        z = how ? parseFloat(how) : 1;
        zoom_state = z;
        break;
    }

    // zoom view
    v.zoom(z);

    this.updatePreview();

    // if image doesn't fit in the window
    if ( window.innerHeight < this.view.e.innerHeight() ||
         window.innerWidth < this.view.e.innerWidth() ) {
        this.onTooBig();
    } else {
        // image fits the window -- preview is not necessary
        this.hidePreview();
    }

    if ( zoom_state === this.zoom_state ) {
        return;
    }

    this.zoom_state = zoom_state;
    this.onZoomChanged( this.zoom_state );
},//}}}

createPreview: function (filepath)//{{{
{
    var p, img, w, h, maxw, maxh;

    p = this.preview;
    if (!p) {
        return;
    }

    img = this.preview_img;

    // remove preview if item is not an image
    if ( this.view.type() !== "image" ) {
        if (img) {
            img.attr( "src", "" );
        }
        p.hide();
        return;
    }

    p.show();

    // preview size
    maxw = Math.floor( getConfig('max_preview_width') * window.innerWidth / 100 );
    maxh = Math.floor( getConfig('max_preview_height') * window.innerHeight / 100 );
    w = this.view.width;
    h = this.view.height;
    if (w>maxw) {
        h *= maxw/w;
        w = maxw;
    }
    if (h>maxh) {
        w *= maxh/h;
        h = maxh;
    }

    img.attr( "width", w );
    img.attr( "height", h );
    if (filepath) {
        img.attr( "src", esc(filepath) );
    }
},//}}}

resize: function()//{{{
{
    if( typeof(this.zoom_state) === "string" ) {
        this.zoom();
    }
    this.createPreview();
    this.updatePreview();
},//}}}

updatePreview: function ()//{{{
{
    var img, win, imgw, imgh, ww, wh, w, h, z, doc, pos;

    img = this.preview_img;
    if ( !img || !img.attr("src") ) {
        return false;
    }

    // highlights the part of the image in window
    win = this.preview_win;
    if (win) {
        imgw = img.innerWidth();
        imgh = img.innerHeight();
        pos = img.position();
        ww = window.innerWidth;
        wh = window.innerHeight;
        w = this.view.width;
        h = this.view.height;
        z = img.innerHeight()/h;

        win.css({
                "height": Math.floor( h<wh ? imgh : z*wh ) +"px",
                "width":  Math.floor( w<ww ? imgw : z*ww ) +"px",
                "top":    pos.top + z*window.pageYOffset +"px",
                "left":   pos.left + z*window.pageXOffset +"px"
              });
    }

    return true;
},//}}}

popPreview: function ()//{{{
{
    var preview, t;

    if ( !this.updatePreview() ) {
        return;
    }

    if (this.preview_t) {
        window.clearTimeout(this.preview_t);
    }

    preview = this.preview;
    preview.addClass("focused");

    this.preview_t = window.setTimeout( preview.removeClass.bind(preview, "focused"),
            this.getConfig('pop_preview_delay') );
},//}}}

hidePreview: function ()//{{{
{
    var p = this.preview;
    if (!p) {
        return;
    }

    if (this.preview_t) {
        window.clearTimeout(this.preview_t);
        p.removeClass("focused");
    }
},//}}}

center: function ()//{{{
{
    var h, newtop;
    // center item in window
    h = this.view.e.innerHeight();
    newtop = h ? ( window.innerHeight - this.view.e.innerHeight() )/2 : 0;
    this.view.e.css("margin-top",(newtop > 0 ? newtop : 0) + "px");
},//}}}

show: function (filepath)//{{{
{
    var v, t;

    if (this.view) {
        this.view.remove();
    }

    v = this.view = this.viewFactory.newView(filepath);
    if ( v ) {
        t = this;
        v.onLoad = function()
        {
            scrollTo(0,0);
            t.createPreview(filepath);
            t.zoom();
            t.onLoad();
        };
        v.show();
    }
    else if (this.onError) {
        this.onError("Unknown format: \""+filepath+"\"");
    }
},//}}}

width: function ()//{{{
{
    return this.view ? this.view.width : 0;
},//}}}

height: function ()//{{{
{
    return this.view ? this.view.height : 0;
},//}}}

/** events */
/** \fn onUpdateStatus(msg,class_name)
 * \brief event is triggered after changing status of view/viewer
 * \param msg status text
 * \param class_name class of status text ("loading", "error" or custom)
 *
 */
onUpdateStatus: function (msg,class_name) {},

/** \fn onLoad()
 * \brief event is triggered after item is successfully loaded
 */
onLoad: function () {},

/** \fn onError(error_msg);
 * \brief event is triggered after error
 */
onError: function (error_msg) {},

/** \fn onZoomChanged(zoom_state)
 * \brief event is triggered after zoom is changed
 * \param zoom_state "fit", "fill" or zoom factor (float)
 */
onZoomChanged: function (zoom_state) {},

/** \fn (preview|image|font|video|...)OnMouseDown()
 */

onTooBig: function () {},

onFontTextChange: function (text) {},

onNext: function () {}
};
//}}}

//! \class ItemList
//{{{
var ItemList = function (e, items, getConfig) { this.init(e, ls, getConfig); };

ItemList.prototype = {
init: function (elem, ls, getConfig)//{{{
{
    var t, item, e;

    // itemlist element
    if (!elem) {
        this.error = true;
        return;
    }
    this.e = elem;

    // mouse down
    t = this;
    elem.mousedown( function (ev){
                if (ev.button === 0 && t.onMouseDown) {
                    t.onMouseDown();
                    ev.preventDefault();
                }
            } );

    // item template element
    item = this.template = elem.find(".item");
    if (this.template.length) {
        e = item.find(".itemident");
        if (e.length) {
            this.e_ident = e;
        }

        e = item.find(".thumbnail_width");
        if (e.length) {
            this.e_w = e;
        }

        this.e_dir = item.find(".directory");
        this.e_filename = item.find(".filename");
        this.e_ext = item.find(".extension");

        e = item.find(".thumbnail");
        if (e.length) {
            this.e_thumb = e;
        }
    } else {
        this.error = true;
        return;
    }

    this.ls = ls;
    this.selected = this.last = this.first = 0;
    this.selection_needs_update = true;

    this.lastpos = [0,0];

    this.viewFactory = new ViewFactory(this);

    this.getConfig = getConfig;
},//}}}

length: function()//{{{
{
	return this.ls.length();
},//}}}

hidden: function ()//{{{
{
    return !this.e.hasClass("focused");
},//}}}

addThumbnail: function (i)//{{{
{
    var page, item, thumb_e, filename, thumb, t;

    item = this.items[i];
	if( !item ) {
		return
	}

    thumb_e = item.find(".thumbnail");
    if (thumb_e.length) {
        item = this.ls.get(i);

        thumb = this.viewFactory.newView(item[0]);

        t = this;
        thumb.thumbnailOnLoad = function (error) {
			if (error === true) {
				thumb_e.remove();
            } else {
                thumb_e.css('display','');
            }
        };

        thumb.thumbnail().appendTo(thumb_e);
    }
},//}}}

newItem: function (i,props)//{{{
{
    var e, item, itemname, tags, size, w, h, key, t;
    item = this.template;

    // image identification
    e = this.e_ident;
    if (e) {
        e.html(i);
    }

	// get item filename, user tags, width, height
	tags = props[1];
	itemname = tags['.link'];
	if ( !itemname ) {
		itemname = props[0];
	}
	size = tags['.thumbnail_size'];
	if (size) {
		w = size[0];
		h = size[1];
	}

	// set .thumbnail_width max-width
    e = this.e_w;
	if (e) {
		e.css("max-width",
                w>100 ? w+20 : this.getConfig('thumbnail_max_width')+'px');
    }

    // filename
    createPathElements(
        this.e_dir,
        this.e_filename,
        this.e_ext,
        itemname);

	// thumbnail size
    e = this.e_thumb;
	if (e) {
        e.css({ "display": w||h ? "" : "none",
                "width": w ? w+"px" : "",
                "height": h ? h+"px" : "" });
    }

    // clone item
    item = item.clone();

    // user tags
    for (key in tags) {
        e = item.find(key);
        if (e.length) {
            e.html(tags[key]);
        }
    }

    // remove empty elements
    item.find('.remove_if_empty').each(
            function () {
                var t = $(this);
                if( !t.html() ) {
                    t.remove();
                }
            });

    // mouse click event
    t = this;
    item.mouseup( function (ev) {
                if (ev.button === 0 && !scrolling) {
                    t.selectItem(i-1);
                    t.submit(i);
                }
            } );

    return item;
},//}}}

nextPage: function()//{{{
{
	if (this.last+1 === this.length()) {
		return;
	}
	this.toggle();
	this.selectItem(this.last+1, true);
	this.toggle();
},//}}}

prevPage: function()//{{{
{
	if (this.first === 0) {
		return;
	}
	this.toggle();
	this.selectItem(this.first-1, true);
	this.toggle();
},//}}}

appendItems: function ()//{{{
{
    var e, ee, ls, items, i, page, item, t;
    e = this.e;
    ls = this.ls;
    items = this.items = {};
	page = ls.page(this.selected);

    // avoid changing the document each time item is added
    e.css("display","none");

	// find index of first item of current page
    for(i=0; ls.page(i) !== page; i+=1);
	this.first = i;

	// previous page navigation
	ee = e.children('.prevpage');
	if (i>0) {
		ee.show();
		ee.click( this.prevPage.bind(this) );
        ee.attr('id','');
        items[i-1] = ee;
	} else {
		ee.hide()
	}

	// add all items on page
    for(; ls.page(i) === page; i+=1) {
		item = ls.get(i);
        item = this.newItem(i+1, item);
        item.appendTo(e);
        items[i] = item;
    }
	this.last = i-1;

	// next page navigation
	ee = e.children('.nextpage');
	if ( i < this.length() ) {
		ee.show();
		ee.click( this.nextPage.bind(this) );
        ee.attr('id','');
        items[i] = ee;
		// show as last element
		ee.appendTo(e);
	} else {
		ee.hide()
	}

    e.css("display","");
},//}}}

createList: function()//{{{
{
	var i;

	// clean list
	this.e.children('.item').remove();

	// add items to gallery
	this.appendItems();

	// current page
	this.page = this.ls.page(this.selected);

	// add thumbnails
	this.thumbs = [];
	for(i=this.selected; i in this.items; i+=1) {
		this.addThumbnail(i);
	}
	for(i=this.selected-1; i in this.items; i-=1) {
		this.addThumbnail(i);
	}

	this.template.remove();

	// selection cursor
	this.selection = this.e.find(".selection");
	this.selection.css("position","absolute");
},//}}}

toggle: function ()//{{{
{
	var page, t;

    if ( !this.length() ) {
        return false; // no items in gallery
    }

    page = this.ls.page(this.selected);
	if ( !this.items || this.selection_needs_update && this.page !== page ) {
		this.createList();
    }

    this.e.toggleClass("focused");

    if ( !this.hidden() ) {
		t = this;
		window.setTimeout(function (){
			if ( t.selection_needs_update ) {
				t.updateSelection();
                t.ensureCurrentVisible();
			}
		}, 100);
    }

    return true;
},//}}}

resize: function ()//{{{
{
    this.updateSelection();
},//}}}

ensureCurrentVisible: function ()//{{{
{
    var e, wx, wy, x, y;

    e = this.items[this.selected];
	if(!e) {
		return;
	}

    // TODO: scroll horizontally to an item
    wx = window.pageXOffset;

    y = e.position().top;
    if ( y+e.innerHeight() > window.pageYOffset+window.innerHeight ) {
        window.scrollTo(wx,y+e.innerHeight()-window.innerHeight);
    }

    if ( y < window.pageYOffset ) {
        window.scrollTo(wx,y);
    }

    wy = window.pageYOffset;

    x = e.position().left;
    if ( x < window.pageXOffset ) {
        window.scrollTo(x,wy);
    }

    x = x + e.innerWidth() - window.innerWidth;
    if ( x > window.pageXOffset ) {
        window.scrollTo(x,wy);
    }
},//}}}

updateSelection: function ()//{{{
{
    var e, pos;
    if ( this.hidden() ) {
        this.selection_needs_update = true;
    } else {
        this.selection_needs_update = false;

        e = this.items[this.selected];
		if (!e) {
			return;
		}

        e.attr("id","selected");

        pos = e.offset();

        // move selection cursor
        this.selection.css({
            "left": pos.left+"px",
            "top": pos.top+"px",
            "width": e.innerWidth()+"px",
            "height": e.innerHeight()+"px"
            });
    }
},//}}}

selectItem: function (i, globally)//{{{
{
	// arg: globally: not restricted by items on current page
	var items, sel;

	items = this.items;
    if (!items || globally) {
        this.selected = Math.min( Math.max(0, i), this.length() );
		this.selection_needs_update = true;
        return;
    }

    if( !items[i] ) {
		return;
	}

    // remove id="selected" from previously selected item
    var sel = items[this.selected];
    if(sel) {
        sel.attr("id", "");
    }

    this.selected = i;

    this.updateSelection();
    this.ensureCurrentVisible();
},//}}}

listVertically: function (direction)//{{{
{
    var sel, pos, x, y, ny, dist, newdist, i, it, e, len;

    sel = this.items[this.selected];
    pos = sel.position();
    x = pos.left - window.pageXOffset + sel.innerWidth()/2;
    y = Math.floor(pos.top + sel.innerHeight()/2);
    dist = 99999; // smallest X distance
    newdist = null;

    // select item on next/previous line,
    // item has smallest X distance from curently selected
    it = this.items;
    len = this.length();
    for( i = this.selected+direction; i < len && i >= 0; i+=direction) {
        e = it[i];
		if (!e) {
			break;
		}
        pos = e.position();

        if ( newdist === null ) {
            ny = pos.top + e.innerHeight()/2;
            if ( direction*(ny-y) < 10 ) {
                continue;
            }
        }
        else if( ny - pos.top - e.innerHeight()/2 > 10 ) {
            break;
        }

        newdist = Math.abs( pos.left + e.innerWidth()/2 - x );
        if ( newdist > dist ) {
            break;
        }

        dist = newdist;
    }

    // no new line encountered
    if (newdist === null) {
        return;
    }

    // select new
    this.selectItem(i-direction);
},//}}}

listDown: function ()//{{{
{
    this.listVertically(1);
},//}}}

listUp: function ()//{{{
{
    this.listVertically(-1);
},//}}}

listRight: function ()//{{{
{
    // select next
    var i = this.selected+1;
    if ( !this.items[i] ) {
        return;
    }

    // deselect current and select new
    this.selectItem(i);
},//}}}

listLeft: function ()//{{{
{
    // select next
    var i = this.selected-1;
    if ( !this.items[i] ) {
        return;
    }

    // deselect current and select new
    this.selectItem(i);
},//}}}

listHome: function()//{{{
{
	this.selectItem(this.first);
},//}}}

listEnd: function()//{{{
{
	this.selectItem(this.last);
},//}}}

listPageDown: function ()//{{{
{
    var min_pos, i, items, len;

    min_pos = this.selection.offset().top+window.innerHeight;
    i = this.selected+1;
	items = this.items;
    len = this.length();
    while ( i < len && items[i] && min_pos > items[i].offset().top ) {
        i += 1;
    }
    this.selectItem(i-1);
},//}}}

listPageUp: function ()//{{{
{
    var min_pos, i, items;

    min_pos = this.selection.offset().top-window.innerHeight;
    i = this.selected;
	items = this.items;
    while ( i > 0 && items[i] && min_pos < this.items[i].offset().top ) {
        i -= 1;
    }
    this.selectItem(i+1);
},//}}}

submit: function()//{{{
{
	var item;

    item = this.items[this.selected];

    // onSubmit event on gallery items
    // OR click event on page navigation buttons
	if ( item.hasClass('item') ) {
		this.onSubmit(this.selected+1);
	} else {
		item.click();
	}
},//}}}

/** events */
/** \fn onSubmit(n)
 * \brief event is triggered after selecting item (pressing enter or mouse click)
 * \param n identification of submitted item
 */
onSubmit: function (n){},

onMouseDown: null
};
//}}}

//! \class Info
//{{{
var Info = function (e, getConfig) {
    this.init(e, getConfig);
};

Info.prototype = {
init: function (e, getConfig)//{{{
{
    this.e = e;
    this.getConfig = getConfig;

	this.itemlink = e.find(".itemlink");

    this.progress = e.find(".progress")[0];
    this.counter = e.find(".counter");
    this.counter_now = e.find(".counter_now");
    this.counter_max = e.find(".counter_max");
    this.counter_rem = e.find(".counter_remain");

    this.dir_e = e.find(".directory");
    this.filename_e = e.find(".filename");
    this.ext_e = e.find(".extension");

    this.props = [];
},//}}}

updateProgress: function ()//{{{
{
    var r, w1, w2, shadow, blur, ctx, pi, angle, x, y;

    if ( !this.progress ) {
        return;
    }

    r = this.getConfig('progress_radius');
    w1 = this.getConfig('progress_width');
    w2 = this.getConfig('progress_inner_width');
    shadow = this.getConfig('progress_shadow');
    blur = this.getConfig('progress_blur');

    ctx = this.progress.getContext("2d");
    pi = 3.1415;
    angle = this.len ? 2*pi*this.n/this.len : 0;
    x = r+blur/2;
    y = r+blur/2;

    this.progress.setAttribute("width", r*2+blur);
    this.progress.setAttribute("height", r*2+blur);

    ctx.save();

    //ctx.clearRect(x-r,y-r,2*r,2*r);

    // empty pie
    ctx.shadowBlur = shadow;
    ctx.shadowColor = "black";
    ctx.lineWidth = w1;
    ctx.strokeStyle = this.getConfig('progress_bg');
    ctx.moveTo(x, y);
    ctx.beginPath();
    ctx.arc(x, y, r-w1/2, 0, 2*pi, false);
    ctx.stroke();

    // filled part of pie
    ctx.shadowBlur = blur;
    ctx.shadowColor = this.getConfig('progress_fg');
    ctx.lineWidth = w2;
    ctx.strokeStyle = this.getConfig('progress_fg');
    ctx.moveTo(x, y);
    ctx.beginPath();
    ctx.arc(x, y, r-w1/2, -pi/2, angle-pi/2, false);
    ctx.stroke();

    ctx.restore();

    // move counter to center of the cicle
    if (this.counter.length) {
        this.counter.css("position", "absolute");
        this.counter.css("left", (x-this.counter.innerWidth()/2)+"px");
        this.counter.css("top", (y-this.counter.innerHeight()/2)+"px");
    }
},//}}}

updateItemTitle: function ()//{{{
{
	var link, url;

    link = this.itemlink;
    url = esc(this.href)
    if (link.length) {
        link.attr( "href", url );
        link.click( function() {location.href = url; document.reload()} );
    }

    createPathElements(this.dir_e, this.filename_e, this.ext_e, this.href);
},//}}}

cleanProperties: function ()//{{{
{
    var oldprops = this.props;
    while( oldprops.length ) {
        this.updateProperty( null, oldprops.pop() );
    }
},//}}}

updateProperties: function (props)//{{{
{
    var key;

    // new properties
    for (key in props) {
        this.updateProperty(props[key],key);
    }

},//}}}

updateProperty: function (status_msg, class_name)//{{{
{
    var cls, e;

    // treat '.link' property as href value
    if ( class_name === '.link' ) {
        this.href = status_msg;
    }

    cls = class_name ? class_name : '.msg';
    e = this.e.find(cls);
    if(e.length) {
        if( status_msg !== null ) {
            e.html(status_msg);
            e.show();
        } else {
            e.hide();
        }
    }

    // remember property so it can be removed later
    if (status_msg !== null) {
        this.props.push(cls);
    }
},//}}}

name: function ()//{{{
{
    return this.href;
},//}}}

updateInfo: function (href, i, len, properties)//{{{
{
    this.cleanProperties();

    this.href = href;

    // don't show info when item type is "tag"
    if (href.search(/^\$\(/) > -1) {
        this.e.hide();
        this.e.removeClass("focused");
        this.disabled = true;
    } else {
        this.e.show();
        this.disabled = false;
    }

    this.n = i;
    this.len = len;
	this.counter_max.html( len );
    this.counter_now.html(i);
    this.counter_rem.html( len - i );

    this.updateProperties(properties);
    this.updateProgress();
    this.updateItemTitle();
},//}}}

popInfo: function ()//{{{
{
    if (this.disabled) {
        return;
    }

    if (this.info_t) {
        window.clearTimeout(this.info_t);
    }

    this.e.addClass("focused");

    this.info_t = window.setTimeout( this.e.removeClass.bind(this.e, "focused"),
            this.getConfig('pop_info_delay') );
},//}}}

hidden: function ()//{{{
{
    return !this.e.hasClass("focused");
}//}}}
};
//}}}
//}}}

// Global variables//{{{
// reset user configuration
var config = {};
var config_strict = {};
var controls = {};
var events = {};
var ls = {}; // gallery items
var title;   // gallery title

// url variables
var hash;
var vars;

// page number
var n;
// number of viewed images witout page refresh
var count_n;

// body
var b;

// mouse position
var mouseX, mouseY;

// objects (created if appropriate HTML element is available)
var itemlist, info, viewer, help, options;

// image cache
var preloaded = null;

// URL hash timeout
var url_t;

// slideshow timer
var slideshow_t;

// assigned keyboard actions
var keys = {};
// key action description
var keydesc;

// modes
var modes = {any:"Any", viewer:"Viewer", itemlist:"Item List", help:"Help", slideshow: "Slideshow", options: "Options"};
var mode_stack = [modes.viewer];
// mode scroll offset
var mode_offset = {};
//}}}

// HELPER FUNCTIONS//{{{
var userAgents = {unknown:0, webkit:1, opera:2};

function userAgent ()//{{{
{
    if ( navigator.userAgent.indexOf("WebKit") !== -1 ) {
        return userAgents.webkit;
    }
    if ( navigator.userAgent.indexOf("Opera") !== -1 ) {
        return userAgents.opera;
    } else {
        return userAgents.unknown;
    }
}//}}}

function updateClassName()//{{{
{
	b[0].className = "mode" + mode().replace(' ','') + " item" + n + (n === ls.length() ? " last" : "");
}//}}}

function modeToggle (modename)//{{{
{
    switch(modename) {
        case modes.itemlist:
            return toggleList_();
        case modes.help:
            return toggleHelp_();
        case modes.slideshow:
            return toggleSlideshow_();
        case modes.options:
            return toggleOptions_();
        default:
            return false;
    }
}//}}}

function mode (newmode)//{{{
{
    if (newmode) {
        var pos, current_mode;
        current_mode = mode();

        if (newmode in mode_stack) {
            return false;
        }

        // save scroll position
        mode_offset[current_mode] = [window.pageXOffset, window.pageYOffset];

        // switch to new mode
        if ( !modeToggle(newmode) ) {
            return false;
        }

        // restore scroll position
        pos = mode_offset[newmode];
        if (!pos) {
            pos = [0,0];
        }
        window.scrollTo( pos[0], pos[1] );
        window.setTimeout( window.scrollTo.bind(window, pos[0], pos[1]), 100 );

        mode_stack.push(newmode);
        updateClassName();

        return true;
    } else {
        return mode_stack[mode_stack.length-1];
    }
}//}}}

function modeDrop ()//{{{
{
    var pos, current_mode;
    current_mode = mode();

    if (mode_stack.length <= 1) {
        return false;
    }

    // save scroll position
    mode_offset[current_mode] = [window.pageXOffset, window.pageYOffset];

    // switch to previous mode
    modeToggle(current_mode);
    mode_stack.pop();
    current_mode = mode();

    // restore scroll position
    pos = mode_offset[current_mode];
    if (!pos) {
        pos = [0,0];
    }
    window.scrollTo( pos[0], pos[1] );
    window.setTimeout( window.scrollTo.bind(window, pos[0], pos[1]), 100 );

    updateClassName();

    return true;
}//}}}

function getConfig (name)//{{{
{
    var x, default_value;
    default_value = configs[name];
    if (default_value === undefined) {
        alert("ERROR: Unknown configuration name ('"+name+"')");
        return null;
    }
    default_value = default_value[0];

    if ( (x = config_strict[name]) ||
         (x = vars[name])    ||
         (x = config[name]) )
    {
        // value should be same type as the default value
        switch( typeof(default_value) ) {
            case "boolean":
                return x?true:false;
            case "string":
                return ""+x;
            case "number":
                return parseFloat(x);
            default:
                return x;
        }
    }

    return default_value;
}//}}}

function getPage (i)//{{{
{
    return i ? Math.min( Math.max(i,1), ls.length() ) : 1;
}//}}}

function popInfo ()//{{{
{
    if (!info) {
        return false;
    }

    info.popInfo();
    return true;
}//}}}

function signal (sgn)//{{{
{
    var fn, t;

    if (!events) {
        return;
    }

	if ( getConfig("show_events") ) {
		info.updateProperty("event: " + sgn);
        popInfo();
    }

    fn = events[sgn];
    t = typeof(fn);
    if (t === "string") {
        eval(fn);
    } else if (t === "function") {
        fn();
    }
}//}}}

function updateInfo (itemname, n, props) //{{{
{
    if(!info) {
        return;
    }

    info.updateInfo(itemname, n, ls.length(), props);

    if ( !ls.length() ) {
        info.updateProperty("No items in gallery! Drag-n-Drop some files here.");
    }
    signal("info_update");
}//}}}

function updateTitle ()//{{{
{
    var t, item, filename;

    t = getConfig( 'title_fmt' );
    t = t.replace( /%\{title\}/g, (title ? title : "untitled") );
    t = t.replace( /%\{now\}/g, n );
    t = t.replace( /%\{remaining\}/g, ls.length()-n );
    t = t.replace( /%\{max\}/g, ls.length() );

    // filename/alias
	item = ls.get(n-1);
    if (item[1]) {
        filename = item[1]['.alias'];
    }
    if (!filename) {
        filename = item[0];
    }
    t = t.replace( /%\{filename\}/g, filename );
    document.title = t;
}//}}}

function getUrlVars ()//{{{
{
    var map, parts;

	map = {};
	parts = location.hash.replace(/[#&]+([^=&]+)=([^&]*)/gi,
        function (m,key,value) {
		    map[key] = value;
	    });
	return map;
}//}}}

function updateUrl (timeout)//{{{
{
    hash = "";

    for (var key in vars) {
        hash += (hash ? "&" : "") + key + "=" + vars[key];
    }

    if ( hash !== location.hash ) {
        // if url is updated immediately, user cannot browse images rapidly
		if (url_t) {
			window.clearTimeout(url_t);
        }
		if (timeout) {
            url_t = window.setTimeout( 'if( hash === "'+hash+'" ) location.hash = "#'+hash+'";',timeout );
        } else {
			location.hash = "#"+hash;
        }
    }
}//}}}

function preloadImages()//{{{
{
    var maxnum, num, new_preloaded, begin, end, i, im, item, filename, view;
    if (preloaded === null) {
        // don't preload images when started
        preloaded = {};
        return;
    }

    maxnum = getConfig('preload_images');
    num = maxnum - (n+2) % maxnum;

    new_preloaded = {};
    end = Math.min( n+num, ls.length() );
    begin = Math.max(n-maxnum+num+1,0);
    for(i = begin; i < n; i+=1) {
        new_preloaded[i] = preloaded[i];
    }
    for(i = n; i < end; i+=1) {
        // try to use already preloaded image
        im = preloaded[i];
        if ( !im ) {
            // type of item must be image
			item = this.ls.get(i);
            filename = item[0];
            view = ViewFactory.prototype.newView(filename);
            if (!view || view.type() !== "image") {
                continue;
            }

            // create image
            im = new Image();
            im.src = filename;

            // since we access the disk (read the image) we can also
            // change the url - browser saves history
            updateUrl(1000);
        }
        new_preloaded[i] = im;
    }
    preloaded = new_preloaded;
}//}}}

function toggleList_()//{{{
{
    if (!itemlist) {
        return false
    }

    itemlist.toggle();
    return true;
}//}}}

function scroll (x,y,absolute)//{{{
{
    var oldx, oldy, newx, newy;

    stopDragScroll();

    oldx = window.pageXOffset;
    oldy = window.pageYOffset;

    // scroll
	if (absolute) {
		window.scrollTo(x,y);
    } else {
		window.scrollBy(x,y);
    }

    newx = window.pageXOffset;
    newy = window.pageYOffset;

    if ( newx === oldx && newy === oldy ) {
        return false;
    } else {
        if ( viewer ) {
            viewer.updatePreview();
        }
        signal("scroll");
    }

    if ( newy !== oldy ) {
        if (newy === 0) {
            signal("top");
        }
        if (newy+window.innerHeight >= document.documentElement.scrollHeight) {
            signal("bottom");
        }

        return true;
    }

    if ( newx !== oldx ) {
        if (newx === 0) {
            signal("leftmost");
        }
        if (newx+window.innerWidth >= document.documentElement.scrollWidth) {
            signal("rightmost");
        }

        return true;
    }

    return false;
}//}}}

function scrollDown(how)//{{{
{
    return scroll(0,how ? how : window.innerHeight/4);
}//}}}

function scrollUp(how)//{{{
{
    return scroll(0,how ? -how : -window.innerHeight/4);
}//}}}

function scrollLeft(how)//{{{
{
    return scroll(how ? how : -window.innerWidth/4,0);
}//}}}

function scrollRight(how)//{{{
{
    return scroll(how ? how : window.innerWidth/4,0);
}//}}}

function go (i)//{{{
{
    var newn, r, item, itemname, props;

    if (i === undefined) {
        i = n;
    }
    newn = getPage(i);

    // FIXME: fix memory leaks!!!
    // reload window on every nth item
    r = getConfig('reload_every');
    if (n != newn) {
        if (r) {
            if (count_n > 0 && r && count_n%r === 0 && mode() !== modes.slideshow) {
                count_n = 0;
                vars.n = newn;
                updateUrl();
                location.reload();
                return;
            } else {
                count_n += 1;
            }
        }
    }

    n = vars.n = newn;

    // select item in list
    if (itemlist) {
        // hide item list
        if ( mode() === modes.itemlist ) {
            modeDrop();
        }
        itemlist.selectItem(i-1, true);
    }

	item = ls.get(n-1);
	itemname = item[0];
	props = item[1];

    updateInfo(itemname, n, props);
    viewer.show(itemname);

    updateTitle();
	updateUrl(1000);
	updateClassName();

    signal("go");
    if ( n === 1 ) {
        signal("first");
    }
    if ( n === ls.length() ) {
        signal("last");
    }
}//}}}

function zoom(how)//{{{
{
    if (!viewer) {
        return false;
    }

    viewer.zoom(how);
    signal("zoom");
    return true;
}//}}}

function editText()//{{{
{
    if (!viewer) {
        return false;
    }

    var v = viewer.view;
    if (!v || v.type() !== "font") {
        return false;
    }

    v.e.focus();
    return true;
}//}}}

function videoTogglePlay ()//{{{
{
    if (!viewer) {
        return false;
    }

    var v = viewer.view;
    if (!v || v.type() !== "video") {
        return false;
    }

    v.togglePlay();
    signal("video_play");
    return true;
}//}}}

function videoSpeed (d)//{{{
{
    if (!viewer) {
        return false;
    }

    var v = viewer.view;
    if (!v || v.type() !== "video") {
        return false;
    }

    if (d>0) {
        v.faster();
    } else if (d<0) {
        v.slower();
    } else {
        v.normalSpeed();
    }

    return true;
}//}}}

function videoFaster ()//{{{
{
    videoSpeed(1);
}//}}}

function videoSlower ()//{{{
{
    videoSpeed(-1);
}//}}}

function videoSeek (how)//{{{
{
    if (!viewer) {
        return false;
    }

    var v = viewer.view;
    if (!v || v.type() !== "video") {
        return false;
    }

    v.seek(how);

    return true;
}//}}}

function back ()//{{{
{
    history.back();
    window.setTimeout("location.reload();",100);
}//}}}

function forward ()//{{{
{
    history.forward();
    window.setTimeout("location.reload();",100);
}//}}}

function popPreview ()//{{{
{
    if (!viewer || mode() !== modes.viewer) {
        return false;
    }

    viewer.popPreview();
    return true;
}//}}}

function rotate (degrees, absolute) {//{{{
    var i, rotate_styles, rotate_style, deg, style, newstyle;

    if (!viewer) {
        return;
    }

    rotate_styles = ['-webkit','-moz','-o'];
    for (i in rotate_styles) {
        rotate_style = rotate_styles[i]+'-transform';
        style = viewer.e.css(rotate_style);
        if (!style) {
            continue;
        }

        m = style.match(/rotate\(([0-9.\-]+)deg\)/);

        // new rotation
        if (absolute) {
            deg = degrees;
        } else {
            // parse degrees
            deg = m ? parseFloat(m[1]) : 0;
            deg = (deg+degrees) % 360;
        }

        newstyle = 'rotate(' + deg + 'deg)';
        if (m) {
            // replace original rotation
            style = style.replace(/rotate\(([0-9.\-]+)deg\)/, newstyle);
        } else if (style != "none") {
            // if tranform style contains other transformations then append rotation
            style = style + ' ' + newstyle;
        } else {
            style = newstyle;
        }

        viewer.e.css(rotate_style, style);
        break;
    }
}//}}}
//}}}

// INTERACTION//{{{
var keycodes = [];//{{{
keycodes[13] = "Enter";
keycodes[27] = "Escape";
keycodes[32] = "Space";
keycodes[37] = "Left";
keycodes[38] = "Up";
keycodes[39] = "Right";
keycodes[40] = "Down";
keycodes[33] = "PageUp";
keycodes[34] = "PageDown";
keycodes[35] = "End";
keycodes[36] = "Home";
if ( userAgent() === userAgents.webkit ) {
    keycodes[96] =  "KP0";
    keycodes[97] =  "KP1";
    keycodes[98] =  "KP2";
    keycodes[99] =  "KP3";
    keycodes[100] = "KP4";
    keycodes[101] = "KP5";
    keycodes[102] = "KP6";
    keycodes[103] = "KP7";
    keycodes[104] = "KP8";
    keycodes[105] = "KP9";
    keycodes[106] = "*";
    keycodes[107] = "+";
    keycodes[109] = "Minus";
    keycodes[110] = ".";
    keycodes[111] = "/";
    keycodes[191] = "?";
}//}}}

function next ()//{{{
{
    if ( n === ls.length() ) {
        return false;
    }

    signal("next");
    go(n+1);
    return true;
}//}}}

function prev ()//{{{
{
    if ( n === 1 ) {
        return false;
    }

    signal("prev");
    go(n-1);
    return true;
}//}}}

function keyPress (e)//{{{
{
    var keycode, keyname, trymode_stack, i, k, fn, t;

	keycode = e.keyCode ? e.keyCode : e.which;

    keyname = keycodes[keycode];
    if ( !keyname ) {
		keyname = String.fromCharCode(keycode);
    }

    keyname = (e.altKey ? "A-" : "") +
              (e.ctrlKey ? "C-" : "") +
              (e.metaKey ? "M-" : "") +
              (e.shiftKey ? "S-" : "") +
              keyname.toUpperCase();

	if ( getConfig('show_keys') ) {
		info.updateProperty("key: " + keyname + " ("+keycode+")");
        popInfo();
    }

    if (keysdisabled) {
        if ( keyname === "ESCAPE" && onescapekeysdisabled ) {
            onescapekeysdisabled();
        }
        return;
    }

    // try keys in this mode or modes.any
    trymode_stack = [mode(), modes.any];
    for (i in trymode_stack) {
        k = keys[trymode_stack[i]];
        if (!k) {
            continue;
        }

        fn = k[keyname];
        t = typeof(fn);
        if (t === "string") {
            eval(fn);
        } else if (t === "function") {
            fn();
        } else {
            continue;
        }
        e.preventDefault();
        break;
    }
}//}}}

function addKeys (newkeys, desc, fn, keymode)//{{{
{
    var ekeys, k, tomod, i, modifiers, key, modekeydesc;

    if (!keymode) {
        keymode = modes.any;
    }

    ekeys = keys[keymode];
    if (!ekeys) {
        ekeys = keys[keymode] = {};
    }

    // Alt-k -> ALT-K
    k = newkeys instanceof Array ? newkeys : [newkeys];
    tomod = function (x) {return x[0];};
    for (i in k) {
		modifiers = k[i].toUpperCase().split("-");
		key = modifiers.pop();

		// sort modifiers
		modifiers = modifiers.map(tomod).sort();
		key = modifiers.length ? modifiers.join("-")+"-"+key : key;
        ekeys[key] = fn;
	}

    // key description
    if (!desc) {
        return;
    }
    if (!keydesc) {
        keydesc = {};
    }
    modekeydesc = keydesc[keymode];
    if (!modekeydesc) {
        modekeydesc = keydesc[keymode] = {};
    }
    modekeydesc[desc] = k;
}//}}}

function onMouseWheel (e) {//{{{
    var delta = e.detail ? -e.detail*4 : e.wheelDelta/10;
    scroll(0,-delta);
    e.preventDefault();
}//}}}

// dragScroll () {{{
var tt = 0;
jQuery.extend( jQuery.easing,
{
easeOutCubic: function (x, t, b, c, d) {
        // refresh preview every 30ms
        if ( t>tt ) {
            tt = t+30;
            if ( mode() === modes.viewer ) {
                viewer.updatePreview();
            }
        }
        return (t=t/1000-1)*t*t + 1;
    }
});

function dragScroll (target, preview)
{
    var preview_scale, from_mouseX, from_mouseY, ww2, wh2, w, start, dx, dy, dt;

    function continueDragScroll(e) {
        var t, pos, x, y;

        scrolling = true;
        if(e) {
            mouseX = e.pageX;
            mouseY = e.pageY;
        }

		x = window.pageXOffset;
		y = window.pageYOffset;

		// scroll
        if (preview) {
			pos = preview.offset();
			pos2 = target.offset();
			scroll( preview_scale*(mouseX-pos.left)+pos2.left-ww2,
					preview_scale*(mouseY-pos.top)+pos2.top-wh2, true );
        } else {
            scroll(from_mouseX-mouseX, from_mouseY-mouseY);
        }

        t = new Date().getTime();
		dt = t-start;
		start = t;
		dx = window.pageXOffset-x;
		dy = window.pageYOffset-y;

        signal("scroll");
        if (e) {
            e.preventDefault();
        }
    }

    function stopDragScroll(e) {
        var accel, vx, vy;

        scrolling = false;
        w.unbind('mousemove');
        w.unbind('mouseup');

        if (dt>0) {
            accel = getConfig('slide_scroll')/dt;
            vx = dx*accel;
            vy = dy*accel;

            tt = mode() === modes.viewer ? 50 : 1000;
            $('html,body').animate({
                scrollLeft: window.pageXOffset+vx+"px",
                scrollTop: window.pageYOffset+vy+"px"
                }, 1000, "easeOutCubic");
        }

        signal("drag_scroll_end");
        e.preventDefault();
    }

    w = $(window);
	ww2 = w.width()/2;
	wh2 = w.height()/2;

    if (preview) {
        preview_scale = target.innerHeight()/preview.innerHeight();
        continueDragScroll();
    }
    else {
        from_mouseX = mouseX;
        from_mouseY = mouseY;
    }

    $('html,body').stop(true);
    w.mouseup(stopDragScroll);
    w.mousemove(continueDragScroll);

    start = new Date().getTime();
    dt = 0;
	dx = window.pageXOffset;
	dy = window.pageYOffset;
}//}}}

function stopDragScroll ()//{{{
{
    $('html,body').stop();
}//}}}
//}}}

function viewerOnLoad()//{{{
{
    if ( mode() === modes.slideshow ) {
        viewer.e.fadeIn(1000);
    }
    preloadImages();
}//}}}

function createItemList()//{{{
{
    var e = $("#itemlist");
    if (!e.length) {
        return;
    }

    itemlist = new ItemList(e, ls, getConfig);

    itemlist.onSubmit = go;
    itemlist.onMouseDown = function () {signal("itemlist_mouse_down");};
}//}}}

function createViewer(e, preview, info)//{{{
{
    viewer = new Viewer(e, preview, getConfig);
    viewer.onLoad = viewerOnLoad;
    viewer.imageOnMouseDown   = function () {signal("image_mouse_down");};
    viewer.videoOnMouseDown   = function () {signal("video_mouse_down");};
    viewer.fontOnMouseDown    = function () {signal("font_mouse_down");};
    viewer.previewOnMouseDown = function () {signal("preview_mouse_down");};
    viewer.onTooBig           = function () {signal("too_big");};
    viewer.onFontTextChange   = function (text) {config.font_test = text;};
    viewer.onNext             = next;

    if (info) {
        viewer.onUpdateStatus = function (msg,class_name) { info.updateProperty( msg, class_name ); };
        viewer.onError = function (msg) {
            info.updateProperty( msg, ".error" );
            signal("error");
        };
    }

    viewer.onZoomChanged = function (state) {
        if (state === vars.zoom) {
            return;
        } else if (state !== 1) {
            vars.zoom = state;
        } else if ( vars.zoom ) {
            delete vars.zoom;
        }
        updateUrl(1000);
    };

    if (preview) {
        $('html,body').scroll(
                function (){
                    if ( mode() === modes.viewer ) {
                        viewer.updatePreview();
                    }
                }
        );
    }
}//}}}

function createNavigation ()//{{{
{
    var m, i, k, km;

    // keyboard
    if ( userAgent() === userAgents.webkit ) {
        window.onkeydown = keyPress;
    } else {
        window.onkeypress = keyPress;
    }

    // mouse
    window.onmousewheel = document.onmousewheel = onMouseWheel;
    window.addEventListener('DOMMouseScroll', onMouseWheel, false);

    // user controls
    if (controls) {
        for (m in controls) {
            km = controls[m];
            for (i in controls[m]) {
                k = km[i];
                addKeys(k[0],k[2],k[1],m);
            }
        }
        controls = {};
    }
}//}}}

function createKeyHelp(e)//{{{
{
    var i, j, cat, modekeydesc, key;

    for (i in modes) {
        modekeydesc = keydesc[modes[i]];
        if ( !modekeydesc ) {
            continue;
        }

        cat = $("<div>", {'class': "category"});
        cat.appendTo(e);

        $('<h3>', {text: modes[i]}).appendTo(cat);

        for (j in modekeydesc) {
            key = $("<div>", {'class': "key"});
            key.appendTo(cat);

            $('<div>', {'class': "which", text: modekeydesc[j].join(", ")}).appendTo(key);
            $('<div>', {'class': "desc", text: j}).appendTo(key);
        }
    }
}//}}}

function createAbout(e)//{{{
{
    var content, i, x, cat;

    content = [
        ["gallery created with","mkgallery v1.0 (<a href='http://github.com/hluk/mkgallery'>website</a>)"],
        ["author","Lukáš Holeček"],
        ["e-mail",'<a href="mailto:hluk@email.cz">hluk@email.cz</a>']
    ];

    for (i in content) {
        x = content[i];

        cat = $("<div>", {'class': "category"});
        cat.appendTo(e);

        $('<div>', {'class': "which", text: x[0]}).appendTo(cat);
        $('<div>', {'class': "desc", html: x[1]}).appendTo(cat);
    }

    // description
    $("<div>", {'class': 'description',
            html: "<p>mkgallery is customizable HTML/Javascript gallery with generator written in Python programming language.</p>"+
            "<p>Supported gallery item formats are images, fonts and audio/video files "+
            "(file extensions <span class='code'>PNG</span>, <span class='code'>JPG</span>, <span class='code'>GIF</span>, <span class='code'>SVG</span>, "+
            "<span class='code'>TTF</span>, <span class='code'>OTF</span> and multimedia files supported by web browser).</p>"}).appendTo(e);
}//}}}

function createHelp(e)//{{{
{
    var ekeys, econf, eother;

    ekeys = e.find(".keys");
    if (ekeys.length) {
        createKeyHelp(ekeys);
    }

    eother = e.find(".about");
    if (eother.length) {
        createAbout(eother);
    }
}//}}}

function toggleHelp_()//{{{
{
    // key bindings
    if (!help) {
        help = $(".help");
        if (!help.length) {
            return false;
        }
        createHelp(help);
    }

    if ( help.length ) {
        if ( help.hasClass("focused") ) {
            help.removeClass("focused");
        }
        else {
            help.addClass("focused");
        }
    }

    return true;
}//}}}

function saveOptions ()//{{{
{
    options.find('.option').each(
        function(){
            var t, which, value, orig_value;
            t = $(this);

            value = t.children('.value');
            if ( value.attr('type') === 'checkbox' ) {
                value = value.is(':checked')?1:0;
            } else {
                value = value.val();
            }
            which = t.children('.which').text();

            delete vars[which];
            orig_value = getConfig(which);
            vars[which] = value;
            if ( orig_value === getConfig(which) ) {
                delete vars[which];
            }
        } );
    updateUrl();
    location.reload();
}//}}}

function generateConfig ()//{{{
{
    var ee, e, content;

    ee = options.children('.config');
    e = ee.children('textarea');

    content = "config = {\n";
    options.find('.option').each(
        function(){
            var t, which, value;
            t = $(this);

            value = t.children('.value');
            if ( value.attr('type') === 'checkbox' ) {
                value = value.is(':checked');
            } else {
                value = value.val();
                if ( typeof(value) === 'string' ) {
                    // escape single quotes and backslash
                    value = "'" + value.replace(/(\\|')/g,"\\$1") + "'";
                }
            }
            which = t.children('.which').text();

            content += '  ' + which + ': ' + value + ',\n';
        } );
    content += '};'

    ee.show();
    e.text(content);
    e.focus();
    e.select();
}
//}}}

function createOptions(e)//{{{
{
    var i, j, cats, cat, catname, conf, desc, key, opt, value, input, box, button;

    // information
    $("<div>", {'class': 'information',
            html:
            '<p>Each entry contains '+
            '<span class="emph">keyword</span> used in URL or the configuration file to set the option, '+
            '<span class="emph">brief description</span> and '+
            '<span class="emph">current option value</span>.</p>'+
            '<p>To make changes permanent press <span class="emph">Copy</span> button and save the text in configuration file <span class="code">config.js</span>.</p>'+
            '<p>Any option can be locked by setting default value of <span class="code">config_strict[<span class="emph">keyword</span>]</span>.</p>'
            }).appendTo(e);

    cats = {};
    for (i in configs) {
        conf = configs[i];
        if (conf.length != 3) {
            continue;
        }
        catname = conf[1];
        if (!catname) {
            continue;
        }

        if( !cats[catname] ) {
            cats[catname] = cat = $("<div>", {'class': "category"});
            $('<h3>',{text: catname}).appendTo(cat);
            cat.appendTo(e);
        }
        cat = cats[catname];

        opt = $("<div>", {'class': "option"});
        opt.appendTo(cat);

        value = getConfig(i);
        $('<div>', {'class': "which", text: i}).appendTo(opt);

        // input: text edit OR checkbox
        if ( typeof(value) === "boolean" ) {
            input = $('<input>', {type:'checkbox', 'class': "value", checked: value});
        } else {
            input = $('<input>', {type:'text', 'class': "value", value: value});
            input.width( Math.min((value+"  ").length, 20) + 'ex');
        }

        // description - replace &x with underlined character and assign x key
        desc = conf[2];
        j = desc.indexOf('_');
        if (j !== -1 && j+1 < desc.length) {
            key = desc[j+1];
            desc = desc.substr(0,j) +
                '<span class="keyhint">'+key+'</span>' +
                desc.substr(j+2);
            // map key to input
            addKeys(key, null, (function(){
                if ( this.attr('disabled') ) {
                    return;
                }
                this.focus();
                this.attr('checked', !this.attr('checked'));
            }).bind(input), modes.options);
        }
        $('<div>', {'class': "desc", html: desc}).appendTo(opt);

        // don't change values in config_strict
        if ( i in config_strict ) {
            input.attr('disabled', 'yes');
        }
        input.appendTo(opt);
    }

    // clicking on option selects input text or toggles checkbox
    $('.option').click( function() {
        input = $(this).children('input');
        input.focus();
    } );

    // config.js contents
    cat = $('<p>', {'class': 'config'});
    cat.html('Add this to your <span class="code">config.js</span>:');
    cat.hide();
    cat.appendTo(e);
    input = $('<textarea>');
    input.appendTo(cat);

    // buttons
    box = $('<div>', {'class':'buttonbox'});
    box.appendTo(e);

    button = $('<input>', {type:'submit','class':'button','value':'Cancel'});
    button.click( function(){$(this).blur(); modeDrop();} );
    button.appendTo(box);

    button = $('<input>', {type:'submit','class':'button','value':'Copy'});
    button.click( function(){$(this).blur(); generateConfig();} );
    button.appendTo(box);

    button = $('<input>', {type:'submit','class':'button','value':'Save'});
    button.click( function(){$(this).blur(); saveOptions();} );
    button.appendTo(box);

	// disable keys when navigation element is focused
	input = $('textarea, input, .button');
    input.focus( function() {
        disableKeys( this.blur.bind(this) );
        $(this).parent().addClass('focused');
    } );
    input.blur( function() {
        enableKeys();
        $(this).parent().removeClass('focused');
    } );
}//}}}

function toggleOptions_()//{{{
{
    // key bindings
    if (!options) {
        options = $(".options");
        if (!options.length) {
            return false;
        }
        createOptions(options);
    }

    if ( options.length ) {
        if ( options.hasClass("focused") ) {
            options.removeClass("focused");
        }
        else {
            options.addClass("focused");
        }
    }

    return true;
}//}}}

function onResize()//{{{
{
    if (viewer) {
        viewer.resize();
    }
    if (itemlist) {
        itemlist.resize();
    }
    signal("resize");
}//}}}

function toggleSlideshow_()//{{{
{
    if ( mode() !== modes.slideshow ) {
        zoom('fit');
        slideshow_t = window.setTimeout( function (){
                    viewer.e.fadeOut(1000, next);
                    slideshow();
                }, getConfig('slideshow_delay') );
    } else {
        window.clearTimeout(slideshow_t);
    }

    return true;
}//}}}

function fileDropped (e) {//{{{
    function saveFile (i, files) {
        var reader;

        if (i >= files.length) {
            return;
        }

        reader = new FileReader();

        // Closure to capture the file information.
        reader.onloadend = (function(i, files) {
            return function(e) {
                var key;

                log('Adding item "'+files[i].name+'" to gallery.');
                // save item to localStorage
                try {
                    if (storage) {
                        // key has three parts separated by ';:':
                        //   data:file/type (e.g. 'data:image/jpeg')
                        //   item id -- localStorage[id] contains item data URL
                        //   filename
                        key = ls.length();
                        storage[key] = e.target.result;

                        key = e.target.result.match(/^[^;]*/)[0] + ';:' +
                               key + ';:' + files[i].name;

                        if (!storage.items) {
                            storage.items = key;
                        } else {
                            // newline is item separator
                            storage.items += "\n"+key;
                        }

                        log('Item "'+files[i].name+'" added to localStorage.');
                    }
                } catch (e) {
                    if (e.name === "QUOTA_EXCEEDED_ERR") {
                        if ( confirm('No free local storage space of this gallery.\n'+
                                     'Do you want to remove all items from gallery to free space?') ) {
                            storage.clear();
                        }
                    } else {
                        alert(e.message);
                    }
                }

                // add file to list
                ls.add(key ? key : e.target.result, {'.link': files[i].name});
                // refresh
                go();
                // next file
                saveFile(++i, files);
            };
        })(i, files);

        // Read in the image file as a data URL.
        reader.readAsDataURL(files[i]);
    }

    saveFile(0, e.dataTransfer.files);

    e.stopPropagation();
    e.preventDefault();
    return false;
}//}}}

function restoreItems () {//{{{
    var items, item, key;

    items = storage.items;
    if (!items) {
        return;
    }

    items = items.split('\n');
    for (item in items) {
        key = items[item];
        if (key) {
            log("Restoring gallery item \""+key+'"');
            ls.add( key, {'.link': key.split(';:')[2]} );
        }
    }
}//}}}

function onLoad()//{{{
{
    var e, preview;

	if ( ls.length === 0 ) {
		//alert("No items in gallery!");
        //return;
	}

    b = $('body');

    // get URL variables
    vars = getUrlVars();

	// change ls from array to object
	ls = new Items( ls, getConfig('max_page_items') );

    // user storage
    if (localStorage) {
        storage = localStorage;
        restoreItems();
    }

    if ( getConfig('shuffle') ) {
        ls.shuffle(); // shuffle items
    }

    // viewer on nth item
    n = getPage( getConfig('n') );
    count_n = 0;

    // capture mouse position
    mouseX = mouseY = 0;
    $(document).mousemove( function(e){
            mouseX = e.pageX;
            mouseY = e.pageY;
            } );

    // item list
    if ( !getConfig('no_list') ) {
        createItemList();
    }

    // info
    e = $('#info');
    if ( e.length ) {
        if ( getConfig('no_info') ) {
            e.hide();
        } else {
            info = new Info(e, getConfig);
        }
    }

    // viewer
    e = $('#canvas');
    if (e.length) {
        preview = $('.preview');
        if ( getConfig('no_preview') ) {
            preview.hide();
            preview = undefined;
        }
        createViewer(e, preview, info);
    }

    // refresh zoom on resize
    window.onresize = onResize;

    // browser with sessions: update URL when browser window closed
    b.bind('beforeunload', updateUrl);

    // navigation
    createNavigation();

    signal('load');

    go(n);

    if ( getConfig('slideshow') ) {
        slideshow();
    }

    // drop files
    // FIXME: browser throws QUOTA_EXCEEDED_ERR when all localStorage space
    //        allocated for web page is used
    if ( getConfig('allow_drop') ) {
        $(window).bind('dragenter dragover', function (e) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        });
        window.addEventListener('drop', fileDropped, false);
    }
}//}}}

