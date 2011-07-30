/*jslint evil: true, forin: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, newcap: true, immed: true, strict: true */
/*global $, window, document, navigator, location, history, escape, alert, Image*/

"use strict";
// a_function.bind(object, arg1, ...)
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

// console logging
if ( window.console ) {
    var log = window.console.log.bind(window.console);
}

// class and interface construct //{{{
// var ClassName = Class(InheritFrom1, InheritFrom2, ..., new_prototype)
// NOTE: arguments in new_prototype.init must be variable
function newClass(var_args) {//{{{
    var new_class, init, proto, i, cls, cls_proto, cls_member, args;

    args = arguments;

    // constructor
    init = arguments[arguments.length-1].init;
    new_class = init ?
        function (var_args) {init.apply(this, arguments)} :
        function (var_args) {};

    // resulting prototype
    new_class.prototype = proto = {};

    // InheritFrom
    for(i=0; i<args.length-1; ++i) {
        cls_proto = args[i].prototype;
        for(cls_member in cls_proto) {
            proto[cls_member] = cls_proto[cls_member];
        }
    }

    // new prototype
    cls_proto = arguments[i];
    for(cls_member in cls_proto) {
        proto[cls_member] = cls_proto[cls_member];
    }

    return new_class;
}//}}}

function Interface(var_args) {//{{{
    return newClass.apply(this, arguments);
}//}}}

function Class(var_args) {//{{{
    var cls, proto, member;

    cls = newClass.apply(this, arguments);

    // no members of class are undefined
    // only interface can have undefined members
    proto = cls.prototype;
    for(member in proto) {
        if ( proto[member] === undefined ) {
            log("ERROR: a prototype has undefined members!");
            log(proto);
            throw "Undefined member";
            return null;
        }
    }

    return cls;
}//}}}
//}}}

// DEFAULT CONFIGURATION {{{
// option: [default value, category, description]
// character after underscore in description is keyboard shortcut
var configs = {
    'allow_drop': [true, "_General", "Allow drag-n-drop new files to gallery"],
	'no_preview': [false, "_General", "Disable item _preview window"],
	'no_list': [false, "_General", "Disable item _list"],
	'no_info': [false, "_General", "Disable item _info"],
	'title_fmt': ['%{title}: %{now}/%{max} "%{filename}"' ,"_General", "_Title format (keywords: title, filename, now, max, remaining)"],
	'pop_info_delay': [4000, "_General", "Info pop up _delay (in milliseconds)"],
	'slide_scroll': [100, "_General", "Slide scroll _amount"],
    'shuffle': [false, "_General", "Randomly _shuffle gallery items"],
    'transparency': ["", "_General", "Color for transparency"],

	'font_size': [16, "_Font", "font _size"],
	'font_thumbnail_text': ['+-1234567890,<br/>abcdefghijklmnopqrstuvwxyz,<br/>ABCDEFGHIJKLMNOPQRSTUVWXYZ', "_Font", "Font t_humbnail text (HTML)"],
	'font_test': ['+-1234567890, abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, ?!.#$\\/"\'', "_Font", "Te_xt for fonts"],

	'zoom': ['1', "_Images", "Default _zoom level"],
	'zoom_step': [0.125, "_Images", "Z_oom multiplier"],
    'image_on_canvas': [false, "_Images", "Use HTML5 _canvas element to draw images"],
    'sharpen': [0, "_Images", "Amount used to s_harpen images (slow)"],
    'max_preview_width': [15, "_Images", "Maximal preview _width in percent of window width"],
    'max_preview_height': [80, "_Images", "Maximal preview _height in percent of window height"],
	'pop_preview_delay': [1000, "_Images", "Preview pop up delay (in milliseconds)"],

    'slideshow': [false, "_Slideshow", "_Slideshow mode"],
	'slideshow_delay': [8000, "_Slideshow", "Slideshow _delay"],

	'progress_fg': ["rgba(255,200,0,0.8)", "_Progress bar appearance", "foreground color"],
	'progress_bg': ["rgba(200,200,200,0.4)", "_Progress bar appearance", "background color"],
	'progress_radius': [22, "_Progress bar appearance", "Radius"],
	'progress_width': [8, "_Progress bar appearance", "Circle stroke width (background)"],
	'progress_inner_width': [8, "_Progress bar appearance", "Circle stroke width (foreground)"],
	'progress_shadow': [10, "_Progress bar appearance", "Shadow size"],
	'progress_blur': [10, "_Progress bar appearance", "Blur amount"],

	'thumbnail_max_width': [300, "_Thumbnail", "Maximum width"],
    'use_svg_thumbnails': [false, "_Thumbnail", "Use original vector image as thumbnail (can be slow)"],
    'max_page_items': [0, "_Thumbnail", "Maximum number of items on page"],

	'autoplay': [false, "_Audio/Video", "Pla_y audio/video when viewed"],
	'autonext': [false, "_Audio/Video", "Go to _next item whed playback ends"],
	'loop': [false, "_Audio/Video", "_Replay when playback ends"],

	'preload_views': [2, "_Debug", "Number of views to pr_eload"],
	'preloaded_views': [2, "_Debug", "Number of preloaded views to leave in cache"],
    'reload_every': [0, "_Debug", "N_umber of items to view after the gallery is refreshed"],
	'show_keys': [false, "_Debug", "Show pressed keys in info (<pre>last\\_keypress\\_event</pre>, <pre>last\\_keyname</pre> variables)"],
	'show_events': [false, "_Debug", "Show events in info"],

	'n': [1, ""]
}//}}}

// CLASSES//{{{
// drag scrolling
var scrolling = false;

// user storage
var storage;

function esc (str) {//{{{
	// escape hash and question mark in filenames
	// ($ won't escape them)
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

//! \class Items
//{{{
var Items = Class({
init: function (list, max_page_items) {//{{{
    this.items = [];
    if (list) {
        this.setItems(list, max_page_items);
    }
},//}}}

setItems: function(ls, max_page_items)//{{{
{
	var item, i, len;

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
		if ( !(item instanceof Array) ) {
			item = [item,{}];
		} else if (item.length < 2) {
			item.push({});
		}
        this.append(item[0], item[1]);
	}
},//}}}

length: function()//{{{
{
	return this.items.length;
},//}}}

get: function(i)//{{{
{
    var res, key;

    if ( i < this.length() ) {
        res = this.items[i];
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
		return this.items[i][1].page_;
	}
	return -1;
},//}}}

shuffle: function ()//{{{
{
    var items, tmp, i, j;
    items = this.items;

    i = this.length();
    while(i>0) {
        j = Math.floor( Math.random() * i );
        i -= 1;
        tmp = items[j];
        items[j] = items[i];
        items[i] = tmp;
    }
},//}}}

clear: function ()//{{{
{
    this.items = [];
},//}}}

append: function (url, props)//{{{
{
    var p = props ? props : {};
    p.page_ = this.pages;

    this.items.push( [url, p] );
}//}}}
});
//}}}

//! \interface ItemView
//{{{
var ItemView = Interface({
/**
 * \fn init(itempath, parent)
 * \param itempath item filename
 * \param parent item parent (Viewer)
 */

/** \fn type()
 * \return an identifier of type (e.g. "image", "font")
 */
type: undefined,

/** \fn element()
 * \return HTML element for view (used for view preloading)
 */
//element: undefined,

/** \fn show()
 * \return shows view in parent
 */
show: undefined,

/** \fn hide()
 * \return hides view in parent
 */
hide: function()//{{{
{
    this.visible = false;
    if (this.e) {
        this.e.hide();
    }
},//}}}

/**
 * \fn remove()
 * \return removes view from parent
 */
remove: function ()//{{{
{
    var e = this.e;
    if (e) {
        e.attr("src", "");
        e.remove();
    }
},//}}}

/** \fn thumbnail()
 * \brief triggers event thumbnailOnLoad() after thumbnail loaded
 * \return an element representing the thumbnail of item
 */
thumbnail: function ()//{{{
{
    var thumb = this.thumb;

    if ( !thumb ) {
        thumb = this.thumb = $('<div>', {'class': 'thumbnail ' + this.type()});
        this.thumbnailOnLoad();
    }

    return thumb;
},//}}}

/** \fn zoom(how)
 * \param how "fit" (fit to window), "fill" (fill window), float (zoom factor), other (do nothing)
 * \return current zoom factor
 */
zoom: function(how) {return 1},

/** EVENTS */
/** \fn onLoad()
 * \brief event is triggered after view is loaded
 */
onLoad: function (){},

/** \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 * \param error true if error occured
 */
thumbnailOnLoad: function (error){}
});
//}}}

//! \class ImageView
//! \implements ItemView
//{{{
var ImageView = Class(ItemView, {
init: function (imgpath, parent) {
    this.path = imgpath;
    this.parent = parent;
},

type: function ()//{{{
{
    return "image";
},//}}}

element: function()//{{{
{
    var self, e, use_canvas;

    e = this.e
    if (e) {
        return e;
    }

    // don't use canvas in some cases:
    //  - user configuration
    //  - GIF: redraw animated images in intervals
    this.use_canvas = use_canvas = this.parent.getConfig('image_on_canvas') &&
        this.path.search(/\.gif$/i) === -1;

    if ( use_canvas ) {
        e = this.e = $("<canvas>");
        this.img = $("<img>");
        this.ctx = this.e[0].getContext('2d');
    } else {
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
    }

    e.css("display","block")
     .hide()
     .addClass("imageview")
     .appendTo(this.parent.e);

    self = this;
    this.img.load( function () {
        self.orig_width = self.width = this.width ? this.width : this.naturalWidth;
        self.orig_height = self.height = this.height ? this.height : this.naturalHeight;
        self.loaded = true;

        if ( self.visible ) {
            self.parent.onUpdateStatus(null);
            self.onLoad();
        }
    } ).attr( "src", esc(this.path) );

    return e;
},//}}}


show: function ()//{{{
{
    var self, e;

    this.parent.onUpdateStatus("loading");

    e = this.element().show();
    this.visible = true;

    if (this.loaded) {
        this.parent.onUpdateStatus(null);
        this.onLoad();
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

sharpen: function(strength)//{{{
{
    if (this.use_canvas) {
		if (strength < 0) strength = 0;
        else if (strength > 1) strength = 1;

        var dataDesc = this.ctx.getImageData(0, 0, this.width, this.height);
        var data = dataDesc.data;
        var dataCopy = this.ctx.getImageData(0, 0, this.width, this.height).data;

        var mul = 15;
        var mulOther = 1 + 3*strength;

        var kernel = [
            [0, 	-mulOther, 	0],
            [-mulOther, 	mul, 	-mulOther],
            [0, 	-mulOther, 	0]
                ];

        var weight = 0;
        for (var i=0;i<3;i++) {
            for (var j=0;j<3;j++) {
                weight += kernel[i][j];
            }
        }

        weight = 1 / weight;

        var w = this.width;
        var h = this.height;

        mul *= weight;
        mulOther *= weight;

        var w4 = w*4;
        var y = 0;

        var filter = function(miny){
            var filter_batch = function(){
                do {
                    var offsetY = (y-1)*w4;

                    var nextY = (y == h) ? y - 1 : y;
                    var prevY = (y == 1) ? 0 : y-2;

                    var offsetYPrev = prevY*w4;
                    var offsetYNext = nextY*w4;

                    var x = w;
                    do {
                        var offset = offsetY + (x*4-4);

                        var offsetPrev = offsetYPrev + ((x == 1) ? 0 : x-2) * 4;
                        var offsetNext = offsetYNext + ((x == w) ? x-1 : x) * 4;

                        var r = ((
                                    - dataCopy[offsetPrev]
                                    - dataCopy[offset-4]
                                    - dataCopy[offset+4]
                                    - dataCopy[offsetNext])		* mulOther
                                + dataCopy[offset] 	* mul
                                );

                        var g = ((
                                    - dataCopy[offsetPrev+1]
                                    - dataCopy[offset-3]
                                    - dataCopy[offset+5]
                                    - dataCopy[offsetNext+1])	* mulOther
                                + dataCopy[offset+1] 	* mul
                                );

                        var b = ((
                                    - dataCopy[offsetPrev+2]
                                    - dataCopy[offset-2]
                                    - dataCopy[offset+6]
                                    - dataCopy[offsetNext+2])	* mulOther
                                + dataCopy[offset+2] 	* mul
                                );


                        if (r < 0 ) r = 0;
                        if (g < 0 ) g = 0;
                        if (b < 0 ) b = 0;
                        if (r > 255 ) r = 255;
                        if (g > 255 ) g = 255;
                        if (b > 255 ) b = 255;

                        data[offset] = r;
                        data[offset+1] = g;
                        data[offset+2] = b;
                    } while (--x);
                } while (++y < miny);
            }
            filter_batch();
            this.ctx.putImageData(dataDesc, 0, 0);
            if (y < h) {
                miny = Math.min(y+50, h);
                window.setTimeout(filter.bind(this, miny), 0);
            }
        }
        window.setTimeout(filter.bind(this, 50), 0);
    }

    return this;
},//}}}



zoom: function (z)//{{{
{
    var w, h, sharpen;

    if (!z) {
        return this.width/this.orig_width;
    }

    w = this.orig_width;
    h = this.orig_height;

    if (this.zoom_factor !== z) {
        // clear canvas
        if(this.width && this.ctx.clearRect) {
            this.ctx.clearRect(0,0,this.width,this.height);
        }

        this.width = this.e[0].width = Math.ceil(w*z);
        this.height = this.e[0].height = Math.ceil(h*z);

        // redraw image
        this.ctx.drawImage(this.img[0],0,0,this.width,this.height);

        if (this.use_canvas) {
            // apply filters
            // get other filters: http://www.pixastic.com/lib/download/
            sharpen = this.parent.getConfig('sharpen');
            if ( sharpen > 0 ) {
                this.sharpen(sharpen);
            }
        }
    }

    this.zoom_factor = z;

    this.parent.onUpdateStatus( w+"x"+h, ".resolution" );
    this.parent.onUpdateStatus( z===1 ? null : Math.floor(z*100), ".zoom" );

    this.parent.center();

    return this.width/this.w;
},//}}}
});
//}}}

//! \class VideoView
//! \implements ItemView
//{{{
var VideoView = Class(ItemView, {
init: function (vidpath, parent) {
    this.path = vidpath;
    this.parent = parent;
    this.zoom_factor = 1;
},

type: function ()//{{{
{
    return "video";
},//}}}

element: function()//{{{
{
    var self, e;

    if ( this.e ) {
        return this.e;
    }

	e = this.e = $('<video>')
        .hide()
        .html("Your browser does not support the video tag.")
        .attr("controls","controls")
        .css("display","block")
        .addClass("videoview")
        .attr("id","video");

    self = this;
    e.bind('canplay', function () {
        var s, m;

        self.orig_width  = self.width = this.videoWidth;
        self.orig_height = self.height = this.videoHeight;
		self.duration = this.duration/60;
		s = Math.floor(this.duration);
		m = Math.floor(s/60);
		s = ""+(s-m*60);
		self.duration = m+":"+(s.length === 1 ? "0" : "")+s;
        self.loaded = true;

        if (self.visible) {
            self.parent.onUpdateStatus(null);
            self.onLoad();
        }
    } );
    e.error( this.parent.onUpdateStatus.bind( this.parent, "Unsupported format!", ".error" ) );

    e.attr( "src", esc(this.path) );
    e.appendTo(this.parent.e);

    return e;
},//}}}


show: function ()//{{{
{
    var e, p;

    p = this.parent;
    p.onUpdateStatus("loading");

    e = this.element().show();
    this.visible = true;

    if (this.loaded) {
        this.parent.onUpdateStatus(null);
        this.onLoad();
    }

	if ( p.getConfig('autoplay') ) {
		e.attr("autoplay","autoplay");
    }
	if ( p.getConfig('loop') ) {
		e.attr("loop","loop");
    }
	if ( p.getConfig('autonext') ) {
		e.bind( "ended", function () {p.onNext();} );
    }
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
});
//}}}

//! \class FontView
//! \implements ItemView
//{{{
var FontView = Class(ItemView, {
init: function (itempath, parent) {
    this.path = itempath;
    this.parent = parent;
    this.zoom_factor = 1;
    this.font = this.path.replace(/[^a-zA-Z0-9_]+/g,'_');
	this.width = this.height = 0;
},

type: function ()//{{{
{
    return "font";
},//}}}

element: function()//{{{
{
    var e, self;

    if (this.e) {
        return this.e;
    }

    //e = this.e = $( document.createElement("textarea") );
    e = this.e = new TextEdit("",this.parent.getConfig('font_test'),true).edit;
    e.attr( "src", esc(this.path) )
     .hide()
     .addClass("fontview")
     .css("font-family", this.font)
     .appendTo(this.parent.e)
     .change();

    return e;
},//}}}


show: function ()//{{{
{
    this.element();
    this.visible = true;
    this.onLoad();
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
    // FIXME: better font zooming
    var orig, z, zz;
    orig = this.parent.getConfig('font_size');

    if (!this.height) {
        this.height = this.orig_height = this.e.height();
        this.width = this.orig_width = this.e.width();
    }

    if(!how) {
        return this.width/this.orig_width;
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

    //this.parent.center();

    // for firefox this.e.css("font-size") is "...px" not "pt"
    this.parent.onUpdateStatus( this.e[0].style.fontSize, ".fontsize" );

    return this.width/this.orig_width;
},//}}}

updateHeight: function ()//{{{
{
    var self, e;
    // FIXME: better solution
    e = this.e;
    e.hide();
    e.css("height","50%");
    self = this;
    window.setTimeout(
        function (){
            self.height = e.height();
            self.width = e.width();
            e.show();
            e.css("height", e[0].scrollHeight + "px");
            self.parent.center(e.innerHeight());
        },10);
},//}}}
});
//}}}

//! \class HTMLView
//! \implements ItemView
//{{{
var HTMLView = Class(ItemView, {
init: function (itempath, parent) {
    this.path = itempath;
    this.parent = parent;
	this.width = this.height = 0;
},

type: function ()//{{{
{
    return "html";
},//}}}

element: function()//{{{
{
    var e, self;

    if (this.e) return this.e;

    self = this;
    if ( this.path.match(/\.pdf$/i) ) {
        this.e = e = $('<embed>', {
            'class': 'htmlview',
            seamless: 'yes',
            name: 'plugin',
            type: 'application/pdf',
            width: '100%',
            height: '100%'
        });
    } else {
        this.e = e = $('<iframe>', {
            'class': 'htmlview',
            seamless: 'yes'
        });
    }
    e.load( function () {
		//self.orig_width = self.width = this.width ? this.width : this.naturalWidth;
		//self.orig_height = self.height = this.height ? this.height : this.naturalHeight;
        e[0].contentWindow.document.body.style.margin = 0;
		self.orig_width = self.width = e[0].contentWindow.document.body.scrollWidth;
		self.orig_height = self.height = e[0].contentWindow.document.body.scrollHeight;
		e.width(self.width);
		e.height(self.height);
        self.loaded = true;

        if (self.visible) {
            self.parent.onUpdateStatus(null);
            self.onLoad();
        }
	} )
    .hide()
    .appendTo(this.parent.e)
    .attr( 'src', esc(this.path) );

    return e;
},//}}}

show: function ()//{{{
{
    var self, e;

    this.parent.onUpdateStatus("loading");

    e = this.element().show();
    this.visible = true;

    if (this.loaded) {
        this.parent.onUpdateStatus(null);
        this.onLoad();
    }
},//}}}

zoom: function (z)//{{{
{
    var w, h, p, t, cssline;

    if (!z) {
        return this.width/this.orig_width;
    }

    w = this.orig_width;
    h = this.orig_height;
    this.width = w*z;
    this.height = h*z;

    t = -(1-z)*100/(z*2);
    cssline = "scale("+z+", "+z+") translate("+t+"%, "+t+"%)";
    this.e
        .css({
            '-moz-transform': cssline,
            '-webkit-transform': cssline,
            '-o-transform': cssline,
            'transform': cssline
        });

    this.zoom_factor = z;

    p = this.parent;
    p.onUpdateStatus( w+"x"+h, ".resolution" );
    p.onUpdateStatus( z===1 ? null : Math.floor(z*100), ".zoom" );
    p.center();

    return this.width/this.orig_width;
},//}}}
});
//}}}

//! \class TagView
//! \implements ItemView
//{{{
var TagView = Class(ItemView, {
init: function (tag, parent) {
    var e, m;

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
},

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
});
//}}}

//! \class ViewFactory
//{{{
var ViewFactory = Class({
init: function (parent) {
    this.parent = parent;
},

newView: function (filepath) {//{{{
     var view;

    if (filepath.search(/\.(png|jpg|gif|svg)$|^data:image\/[a-z]+;/i) > -1) {
        view = new ImageView(filepath, this.parent);
    } else if (filepath.search(/\.(ttf|otf)$/i) > -1) {
        view = new FontView(filepath, this.parent);
    } else if (filepath.search(/\.(mp4|mov|flv|ogg|mp3|wav)$/i) > -1) {
        view = new VideoView(filepath, this.parent);
    } else if (filepath.search(/\.(html|pdf)$/i) > -1) {
        view = new HTMLView(filepath, this.parent);
    } else if (filepath.search(/^\$\(<.*\)$/) > -1) {
        view = new TagView(filepath, this.parent);
    } else {
        view = {error:true};
    }
    return view.error ? null : view;
}//}}}
});
//}}}

//! \class Viewer
//{{{
var Viewer = Class({
init: function (e, preview, getConfig) {
    var self, img, win, mousedown;

    this.e = e;
    self = this;
    e.mousedown( function (ev){
                if (ev.button === 0 && self.view) {
                    var fn = self.view.type()+'OnMouseDown';
                    if ( self[fn] ) {
                        self[fn]();
                        ev.preventDefault();
                    }
                }
            } );

    this.zoom_state = getConfig('zoom');
    this.getConfig = getConfig;
    this.viewFactory = new ViewFactory(this);
    this.transparency = getConfig('transparency');

    this.setPreview(preview);

    this.cache_age = 0;
},

setPreview: function(preview)//{{{
{
    var self, img, win, mousedown;

    this.preview = preview;
    if (preview) {
		img = this.preview_img = $('<img>');
		img.appendTo(preview);

        win = this.preview_win = $('<div>', {'class':"preview_window"});
        win.css("position", "absolute");
		win.appendTo(preview);

        self = this;
		mousedown = function (ev){
			if (ev.button === 0 && self.previewOnMouseDown) {
				self.previewOnMouseDown();
				ev.preventDefault();
			}
		};
        win.mousedown(mousedown);
        img.mousedown(mousedown);
    }
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
    if( type === 'font' ) {
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
    if ( window.innerHeight < this.view.height ||
         window.innerWidth < this.view.width ) {
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

    if (this.transparency) {
        img.css("background-color", this.transparency);
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
    var w, h, x, y;

    w = this.view.width;
    x = w ? ( window.innerWidth - w )/2 : 0;

    h = this.view.height;
    y = h ? ( window.innerHeight - h )/2 : 0;

    this.view.e.css({
        'margin-left': (x > 0 ? x : 0) + "px",
        'margin-top': (y > 0 ? y : 0) + "px"
    });
},//}}}

show: function (filepath)//{{{
{
    var self, v, c;

    if (this.view) {
        this.view.hide();
    }

    // retrieve view from cache (or create view)
    c = this.preload(filepath);
	if (c) {
		this.view = v = c.view;
		c.age = this.cache_age;
		self = this;

        v.onLoad = function()
        {
            scrollTo(0,0);
            self.createPreview(filepath);
            self.zoom();
            self.onLoad();

            if (self.transparency) {
                v.e.css("background-color", self.transparency);
            }
        };
        v.show();
    } else if (this.onError) {
        this.onError("Unknown format: \""+filepath+"\"");
    }
},//}}}

preload: function(filepath)//{{{
{
    var cache, age, c, v, f, min_age;

    cache = this.cache;
    if (cache === undefined) {
        cache = this.cache = {};
    }

    c = cache[filepath];
    if (!c) {
        age = ++this.cache_age;
        min_age = age - this.getConfig('preloaded_views') - 1;

        /* discard old cache */
        for (f in cache) {
            c = cache[f];
            if (c.age < min_age) {
                c.view.remove();
                delete cache[f];
            }
        }

        v = this.viewFactory.newView(filepath);
		if (v) {
			c = cache[filepath] = {view: v, age: age};

			if (v.element) {
				v.element();
			}
        }
    }

    return c;
},//}}}

width: function ()//{{{
{
    var v = this.view;
    return (v && v.width) ? v.width : 0;
},//}}}

height: function ()//{{{
{
    var v = this.view;
    return (v && v.height) ? v.height : 0;
},//}}}

scroll: function (x,y,absolute)//{{{
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
});
//}}}

//! \class ItemList
//{{{
var ItemList = Class ({
init: function (elem, items, getConfig) {
    var self, item, e;

    // itemlist element
    if (!elem) {
        this.error = true;
        return;
    }
    this.e = elem;

    // mouse down
    self = this;
    elem.mousedown( function (ev){
                if (ev.button === 0 && self.onMouseDown) {
                    self.onMouseDown();
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
},

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
    var page, item, thumb_e, filename, thumb;

    item = this.items[i];
	if( !item ) {
		return
	}

    thumb_e = item.find(".thumbnail");
    if (thumb_e.length) {
        item = this.ls.get(i);

        thumb = this.viewFactory.newView(item[0]);

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
    var self, e, item, itemname, tags, size, w, h, key;

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
    item = this.template.clone();

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
    self = this;
    item.mouseup( function (ev) {
                if (ev.button === 0 && !scrolling) {
                    self.selectItem(i-1);
                    self.submit(i);
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
	var self, page;

    if ( !this.length() ) {
        return false; // no items in gallery
    }

    page = this.ls.page(this.selected);
	if ( !this.items || this.selection_needs_update && this.page !== page ) {
		this.createList();
    }

    this.e.toggleClass("focused");

    if ( !this.hidden() ) {
        self = this;
		window.setTimeout(function (){
			if ( self.selection_needs_update ) {
				self.updateSelection();
                self.ensureCurrentVisible();
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
});
//}}}

//! \class Info
//{{{
var Info = Class ({
init: function (e, getConfig) {
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
},

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
        link.unbind('click');
        link.click( function() { window.open(url, url) } );
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
});
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

// last keypress event (if getConfig('show_keys'))
var last_keypress_event;
// cache last keyname
var last_keyname_timestamp;
var last_keyname;

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
var modes = {
    any:"Any",
    viewer:"Viewer",
    itemlist:"Item List",
    help:"Help",
    slideshow:"Slideshow",
    options:"Options"
};
var mode_stack = [modes.viewer];
// mode scroll offset
var mode_offset = {};
//}}}

// HELPER FUNCTIONS//{{{
var userAgents = {unknown:0, webkit:1, opera:2};

function userAgent ()//{{{
{
    if ( navigator.userAgent.indexOf("WebKit") >= 0 ) {
        return userAgents.webkit;
    }
    if ( navigator.userAgent.indexOf("Opera") >= 0 ) {
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

        // newmode already on stack
        if ( mode_stack.indexOf(newmode) >= 0 ) {
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

function preloadViews()//{{{
{
    var to_preload, num, end, i, item, filename;
    if (!preloaded) {
        // don't preload views when started
        preloaded = true;
        return;
    }

    to_preload = getConfig('preload_views');
    end = Math.min( n+to_preload, ls.length() );
    for(i = n; i < end; i+=1) {
        item = ls.get(i);
        filename = item[0];
        viewer.preload(filename);
    }
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
    return viewer ? viewer.scroll(x, y, absolute) : false;
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

    $('#read_area').remove();

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
    var i, m, rotate_styles, rotate_style, deg, style, newstyle;

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

function showLastPosition ()//{{{
{
    var e;

    $('#read_area').remove();
    e = $('<div id="read_area">').css({
        position:'absolute',
        'left': window.pageXOffset+'px',
        'top': window.pageYOffset+'px',
        width: window.innerWidth-4+'px',
        height: window.innerHeight-4+'px',
        border: '2px solid red',
        'background-color': 'rgba(255,0,0,0.2)',
        'opacity': 0.5
    }).appendTo(b);
    e.fadeOut(1500, function(){e.remove()});

    return true;
}//}}}
//}}}

// INTERACTION//{{{
var keycodes = {};//{{{
keycodes[9] = "TAB";
keycodes[13] = "ENTER";
keycodes[27] = "ESCAPE";
keycodes[32] = "SPACE";
keycodes[37] = "LEFT";
keycodes[38] = "UP";
keycodes[39] = "RIGHT";
keycodes[40] = "DOWN";
keycodes[46] = "DELETE";
keycodes[33] = "PAGEUP";
keycodes[34] = "PAGEDOWN";
keycodes[35] = "END";
keycodes[36] = "HOME";
//if ( userAgent() === userAgents.webkit ) {
if ( userAgent() !== userAgents.opera ) {
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
    keycodes[109] = "MINUS";
    keycodes[110] = ".";
    keycodes[111] = "/";
    keycodes[112] = "F1";
    keycodes[113] = "F2";
    keycodes[114] = "F3";
    keycodes[115] = "F4";
    keycodes[116] = "F5";
    keycodes[117] = "F6";
    keycodes[118] = "F7";
    keycodes[119] = "F8";
    keycodes[120] = "F9";
    keycodes[121] = "F10";
    keycodes[122] = "F11";
    keycodes[123] = "F12";
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

function getKeyName (ev)//{{{
{
    var keycode, keyname;

    if (ev.timeStamp == last_keyname_timestamp) {
        return last_keyname;
    }

	keycode = ev.which;

    keyname = keycodes[keycode];
    if ( !keyname ) {
		keyname = String.fromCharCode(keycode);
    }

    keyname = (ev.altKey ? "A-" : "") +
              (ev.ctrlKey ? "C-" : "") +
              (ev.metaKey ? "M-" : "") +
              (ev.shiftKey ? "S-" : "") +
              keyname.toUpperCase();

	if ( getConfig('show_keys') ) {
		info.updateProperty("key: " + keyname + " ("+keycode+")");
        last_keypress_event = ev;
        popInfo();
    }

    last_keyname = keyname;
    last_keyname_timestamp = ev.timeStamp;
    return keyname;
}//}}}

function keyPress (ev)//{{{
{
    var e, keyname, trymode_stack, i, k, fn, t;

    keyname = getKeyName(ev);

    e = $(".value.focused");
    if (e.length) {
    }

    // try keys in this mode or modes.any
    trymode_stack = [1, mode(), modes.any];
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
        ev.preventDefault();
        break;
    }
}//}}}

function addKeys (newkeys, desc, fn, keymode, append)//{{{
{
    var ekeys, k, tomod, i, modifiers, key, modekeydesc;

    if (keymode === undefined) {
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
        if (append && ekeys[key]) {
            fn = (function(oldfn, newfn) {
                return function() {return oldfn() || newfn()}
            })(ekeys[key], fn);
        }
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

function addAllKeys (controls)//{{{
{
    var m, k, km, i;

    for (m in controls) {
        km = controls[m];
        for (i in controls[m]) {
            k = km[i];
            addKeys(k[0], k[2], k[1], m);
        }
    }
}//}}}

function onMouseWheel (e) {//{{{
    var delta;

    // if pointer over scrollable area
    if (e.target.offsetHeight < e.target.scrollHeight) {
        return;
    }

    delta = e.detail ? -e.detail*4 : e.wheelDelta/4;
    scroll(0,-delta);
    e.preventDefault();
}//}}}

// dragScroll () {{{
var tt = 0;
$.extend( $.easing,
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
        var t, pos, pos2, x, y;

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

// GUI{{{
/*
 * GUI ELEMENT CLASSES
 *
 * CORE CLASSES
 * .widget: element is widget
 * .input: element is focusable
 * .value: element has a user-defined value
 *
 * BASIC WIDGETS
 * .label: widget has label (with key hint)
 * .textedit: widget is input (text) or textarea (.lineedit OR .multilineedit)
 * .button
 *
 * WIDGET CONTAINERS
 * .buttonbox
 * .widgetlist
 * .tabs
 *
 * VARIOUS
 * .selection: cursor for buttonbox, widgetlist or tabs
 *
 */

var focused_widget;

function init_GUI ()//{{{
{
    // init widgets
    $(".widget, .widget .value").live("focus", function() {
        focused_widget = $(this);
        $(this)
               .addClass("focused")
               .parents(".widget").addClass("focused");
    } );
    $(".widget, .widget .value").live("blur", function() {
        focused_widget = undefined;
        $(this)
               .removeClass("focused")
               .parents(".widget").removeClass("focused");
    } );
}//}}}

//! \interface Widget
//{{{
var Widget = Interface ({
    show: undefined,
    hide: undefined,
    update: undefined
})
//}}}

function createLabel(text)//{{{
{
    var i, c, e, key;

    e = $("<div>", {'class':"widget label"});

    // replace _x with underlined character and assign x key
    for(i=0; i<text.length; ++i) {
        c = text[i];
        if ( c === '_') {
            break;
        } else if (c === '\\') {
            text = text.slice(0,i) + text.slice(i+1)
            ++i;
        }
    }
    if (i+1 < text.length) {
        key = text[i+1];
        text = text.substr(0,i) +
            '<span class="keyhint">'+key+'</span>' +
            text.substr(i+2);
        addKeys( key, null, function() { return e.is(":visible") && e.click() }, modes.options, true );
    }

    e.html(text);
    e.css("cursor","pointer");

    return e;
}//}}}

function createCheckBox(text, checked)//{{{
{
    var i, e, checkbox, label;

    label = createLabel(text);

    e = $("<div>", {'class':"widget checkbox"});
    e.css("cursor","pointer");
    e.keydown( function(ev){
        if ( getKeyName(ev) == 'SPACE' ) {
            ev.stopPropagation();
        }
    } );

    checkbox = $('<input>', {type:"checkbox", 'class':"input value", checked:checked});
    checkbox.prependTo(label);
    checkbox.click( function(ev) {ev.stopPropagation()} );

    label.appendTo(e);

    // clicking on option selects input text or toggles checkbox
    label.click( function() {
        if ( checkbox.attr('disabled') ) {
            return;
        }
        checkbox.focus();
        checkbox.attr( "checked", checkbox.is(':checked') ? 0 : 1 );
    } );

    return e;
}//}}}

function keyHintFocus (keyname, root)//{{{
{
    var keyhint, e;
    if (keyname.length === 1) {
        keyhint = keyname;
    } else {
        // digit (1, KP1, S-1, ...)
        n = keyname[keyname.length-1];
        if (n >= "0" && n <= "9") {
            keyhint = n;
        }
    }

    if (keyhint !== undefined) {
        root.find(".keyhint").each( function() {
            var $this, parent;
            $this = $(this);
            if ( $this.is(":visible") && keyhint === $this.text().toUpperCase() ) {
                parent = $this.parent();
                if ( !parent.hasClass("focused") ) {
                    if ( parent.hasClass("tab") ) {
                        e = parent;
                        e.click();
                    }
                    else if ( parent.hasClass("input") ) {
                        e = parent;
                        e[0].focus();
                    } else {
                        e = parent.find(".input").first();
                        e[0].focus();
                    }

                    if (e.length) {
                        return false; //break
                    }
                }
            }
        } );
    }

    return e && e.length;
}//}}}

//! \class Selection
//{{{
var Selection = Class(Widget, {
init: function (parent) {//{{{
    this.parent = parent;
},//}}}

show: function()//{{{
{
},//}}}

hide: function()//{{{
{
},//}}}

update: function()//{{{
{
    if (current) {
        this.select(current);
    }
},//}}}

select: function(e)//{{{
{
    var ee, pos, current;

    pos = e.offset();

    ee = this.e;
    if (!ee) {
        this.e = ee = $("<div>")
            .css({position:"absolute", 'z-index':-2,
                  top:pos.top, left:pos.left})
            .addClass("selection")
            .appendTo(this.parent);
    }

    ee
        .width( e.outerWidth() )
        .height( e.outerHeight() )
        .offset({top:pos.top, left:pos.left})
        //.css({
            //top:pos.top+"px", left:pos.left+"px"
        //})
    ;

    current = this.current;
    if (current) {
        current.removeClass("current");
    }
    current = e.addClass("current");
}//}}}
});
//}}}

//! \class TextEdit
//{{{
var TextEdit = Class(Widget, {
init: function (label_text, text, multiline) {//{{{
    var i, e, edit, label;

    if (multiline) {
        edit = $("<textarea>", {"class":"multilineedit"});
    } else {
        edit = $("<input>", {"class":"lineedit"});
    }
    edit.attr("value", text);
    edit.addClass("input value");

    edit.keydown( this.keyPress.bind(this) );
    edit.blur( this.blur.bind(this) );

    // update size
    edit.resize( this.update.bind(this) );
    edit.keyup( this.update.bind(this) );

    e = $("<div>", {'class':"widget textedit"});
    e.css("cursor","pointer");

    if (label_text) {
        label = createLabel(label_text);
        // clicking on option selects input text or toggles checkbox
        label.click( function() {
            if ( !edit.attr('disabled') ) {
                edit[0].focus();
            }
        } );
        label.appendTo(e);
    }

    edit.appendTo(label);

    this.multiline = multiline;
    this.label = label;
    this.edit = edit;
    this.e = e;
},//}}}

show: function()//{{{
{
    this.e.show();
    this.update();
},//}}}

hide: function()//{{{
{
    this.e.hide();
},//}}}

update: function()//{{{
{
    var edit, i, j, l, cols, text;
    edit = this.edit;

    if (!this.multiline) {
        // update lineedit
        edit.attr( "size", edit.attr("value").length+2 );
        return;
    }

    // update multilineedit
    text = edit.attr("value");
    cols = 0;
    l = text.length;
    for(i=0,j=0; i<l; ++i) {
        if (text[i]==='\n' || i===l-1) {
            if (i-j > cols) {
                cols = i-j;
            }
            j=i;
        }
    }
    edit.attr( "cols", cols+1 );

    // HACK: set textarea height
    edit.height(0);
    edit[0].scrollTop = 999999;
    edit.height( edit[0].scrollTop + edit.height() );
},//}}}

blur: function()//{{{
{
    this.e.removeClass('focused');
    this.edit.removeClass('focused');
},//}}}

keyPress: function(ev)//{{{
{
    var keyname, k, i;

    keyname = getKeyName(ev);
    k = keyname.split('-');
    k = k[k.length-1];

    // stop propagation only if
    if (
            // a character typed
            k.length === 1 ||
            // textedit keys
            ["LEFT", "RIGHT", "BACKSPACE", "DELETE", "MINUS", "SPACE"].indexOf(k)>=0 ||
            // multilineedit keys
            ( this.multiline && ["UP", "DOWN", "ENTER"].indexOf(k)>=0 )
       )
    {
        ev.stopPropagation();
    }
},//}}}
});
//}}}

//! \class Button
//{{{
// TODO: add button icon
var Button = Class(Widget, {
init: function (label_text, onclick) {//{{{
    var e;

    this.e = e = createLabel(label_text);
    e.addClass("widget input button").attr("tabindex", 0);
    e.click(onclick);
    e.keydown( this.keyPress.bind(this) );
},//}}}

show: function()//{{{
{
    this.e.show();
    this.update();
},//}}}

hide: function()//{{{
{
    this.e.hide();
},//}}}

update: function()//{{{
{
},//}}}

keyPress: function(ev)//{{{
{
    var keyname;
    keyname = getKeyName(ev);

    if ( keyname === "ENTER" || keyname === "SPACE" ) {
        this.e.click();
        return false;
    }
},//}}}
});
//}}}

//! \class WidgetList
//{{{
var WidgetList = Class(Widget, {
init: function () {//{{{
    this.e = $("<div>", {'class': "widget widgetlist"})
             .keydown( this.keyPress.bind(this) );
    this.widgets = [];
    this.items = [];
    this.selection = new Selection(this.e);
    this.current = -1;
},//}}}

show: function()//{{{
{
    this.e.show();
    this.update();
},//}}}

hide: function()//{{{
{
    this.e.hide();
},//}}}

update: function()//{{{
{
    var widgets = this.widgets;
    $.each( widgets, function(i){
        var w = widgets[i];
        if ( w.update ) {
            w.update();
        }
    } );
    this.updateSelection();
},//}}}

next: function()//{{{
{
    var id = this.current;
    if (id >= 0 && id < this.items.length-1) {
        this.select(id+1);
    } else {
        this.select(0);
    }
},//}}}

prev: function()//{{{
{
    var id, l;
    id = this.current;
    l = this.items.length;
    if (id >= 1 && id < l) {
        this.select(id-1);
    } else {
        this.select(l-1);
    }
},//}}}

select: function(id)//{{{
{
    var items, old_id, e;

    items = this.items;

    old_id = this.current;
    if (old_id != id) {
        this.current = id;
        e = items[id];
        e = e.filter(".input")[0];
        if (!e) {
            e = items[id].find(".input")[0];
        }
        if (e) {
            e.focus()
        }
        this.updateSelection();
    }
},//}}}

append: function (widget)//{{{
{
    var widgets, e, ee, id;
    e = this.e;

    if (widget.e) {
        ee = widget.e;
        this.widgets.push(widget);
    } else {
        ee = widget;
    }
    id = this.items.length;
    this.items.push(ee);

    // first & last
    widgets = e.find(".widgetlistitem");
    if ( !widgets.length ) {
        ee.addClass("first");
    }
    widgets.filter(".last").removeClass("last");

    ee.addClass("widget widgetlistitem last");
    ee.filter(".input").focus( (function() {
        this.current = id;
        this.updateSelection();
    } ).bind(this) );
    ee.find(".input").focus( (function() {
        this.current = id;
        this.updateSelection();
    } ).bind(this) );

    ee.appendTo(e);
    ee.children().focus( this.updateSelection.bind(this) );
},//}}}

updateSelection: function()//{{{
{
    if (this.current >= 0) {
        this.selection.select( this.items[this.current] );
    }
},//}}}

keyPress: function(ev)//{{{
{
    var e, keyname, k, i;
    e = this.e;

    keyname = getKeyName(ev);

    if ( e.hasClass("horizontal") ) {
        if (keyname === "LEFT") {
            this.prev();
        } else if (keyname === "RIGHT") {
            this.next();
        } else if ( !keyHintFocus(keyname, e) ) {
            return;
        }
    } else {
        if (keyname === "UP") {
            this.prev();
        } else if (keyname === "DOWN") {
            this.next();
        } else if ( !keyHintFocus(keyname, e) ) {
            return;
        }
    }

    return false;
},//}}}
});
//}}}

//! \class ButtonBox
//{{{
var ButtonBox = Class (WidgetList, {
    init: function()//{{{
    {
        (WidgetList.bind(this))();

        this.e.addClass("buttonbox horizontal");
        this.e.removeClass("widgetlist");
    },//}}}

    updateSelection: function()//{{{
    {
    },//}}}
})
//}}}

//! \class Tabs
//{{{
var Tabs = function () {
    var e, tabs_e;

    this.e = e = $("<div>", {'class':"widget tabs_widget"});
    e.keydown( this.keyPress.bind(this) );

    this.tabs_e = tabs_e = $("<div>", {'class':"tabs", 'tabindex':0})
        .appendTo(e);
    this.pages_e = $("<div>", {'class':"pages"})
        .appendTo(e);

    this.pages = [];
    this.current = -1;
    this.selection = new Selection(this.tabs_e);
};

Tabs.prototype = {
show: function()//{{{
{
    this.e.show();
    this.update();
},//}}}

hide: function()//{{{
{
    this.e.hide();
},//}}}

update: function()//{{{
{
    if (this.current >= 0) {
        this.pages[this.current].update();
    }
    this.updateSelection();
},//}}}

next: function()//{{{
{
    var id = this.current;
    if (id >= 0 && id < this.pages.length-1) {
        this.toggle(id+1);
    } else {
        this.toggle(0);
    }
},//}}}

prev: function()//{{{
{
    var id, l;
    id = this.current;
    l = this.pages.length;
    if (id >= 1 && id < l) {
        this.toggle(id-1);
    } else {
        this.toggle(l-1);
    }
},//}}}

toggle: function(id)//{{{
{
    var pages, page, pos, old_id;

    pages = this.pages;

    old_id = this.current;
    if (old_id >= 0) {
        pages[old_id].hide();
        this.tabs_e.children(".tab").eq(old_id).removeClass("focused");
    }

    if (old_id != id) {
        page = pages[id];
        page.show();

        // ensure visible
        page = page.e ? page.e : page;
        pos = page.offset();
        window.scrollTo(pos.left, pos.top);
        pos = this.tabs_e.offset();
        window.scrollTo(pos.left, pos.top);

        this.tabs_e.children(".tab").eq(id).addClass("focused");
        this.current = id;
    } else {
        this.current = -1;
    }

    this.updateSelection();
},//}}}

updateSelection: function()//{{{
{
    var id, tab, pos, sel;
    if( !this.e.is(":visible") ) {
        return;
    }

    id = this.current;
    if(id >= 0) {
        tab = this.tabs_e.children(".tab").eq(id);
        sel = this.selection;
        sel.select(tab);
    }
},//}}}

append: function (tabname, widget)//{{{
{
    var self, tab, id, page;

    this.pages.push(widget);
    page = widget.e ? widget.e : widget;

    tab = createLabel(tabname);
    tab.addClass("tab");
    tab.appendTo(this.tabs_e);

    widget.hide();
    page.addClass("widget page");
    page.appendTo(this.pages_e);

    id = this.pages.length-1;
    tab.click( this.toggle.bind(this, id) );

    if(id===0) {
        this.toggle(0);
    }

    return tab;
},//}}}

keyPress: function(ev)//{{{
{
    var e, page, keyname, k, i;
    e = this.e;

    keyname = getKeyName(ev);

    // focus next/previous tab
    if ( e.hasClass("vertical") && keyname === "UP" || keyname === "LEFT" ) {
        this.tabs_e[0].focus();
        this.prev();
        return false;
    } else if ( e.hasClass("vertical") && keyname === "DOWN" || keyname === "RIGHT" ) {
        this.tabs_e[0].focus();
        this.next();
        return false;
    }

    // send key press event to active page
    if (this.current >= 0) {
        page = this.pages[this.current];
        if (page.e) {
            if ( page.keyPress(ev) === false ) {
                return false;
            } else if ( ev.isPropagationStopped() ) {
                return;
            }
        }
    }

    // keyhints
    if ( keyHintFocus(keyname, e) ) {
        return false;
    }
},//}}}
};
//}}}

//! \class Window
//{{{
var Window = function (e) {
    this.e = e;
    e.addClass("window");
    e.keydown( this.keyPress.bind(this) );
    $(window).resize( this.update.bind(this) );
    e.hide();

    // close button
    $("<div>", {'class':"close", 'html':"&#8855"}).css('cursor','pointer').click(modeDrop).appendTo(e);

    this.widgets = [];
};

Window.prototype = {
toggleShow: function()//{{{
{
    if ( this.e.hasClass("focused") ) {
        this.hide();
    }
    else {
        this.show();
    }
},//}}}

show: function()//{{{
{
    this.e.show().addClass("focused");
    this.update();
},//}}}

update: function()//{{{
{
    var widgets = this.widgets;
    $.each( widgets, function(i){widgets[i].update()} );
},//}}}

hide: function()//{{{
{
    this.e.find("#focused").blur();
    this.e.removeClass("focused").hide();
},//}}}

append: function(widget)//{{{
{
    if ( widget.e && widget.e.hasClass("widget") ) {
        this.widgets.push(widget);
        widget.e.appendTo(this.e);
    } else {
        widget.appendTo(this.e);
    }
},//}}}

keyPress: function(ev)//{{{
{
    var keyname;
    keyname = getKeyName(ev);

    // keyhints
    if ( !keyHintFocus(keyname, this.e) ) {
        keyPress(ev);
    }

    ev.stopPropagation();
},//}}}
};
//}}}
//}}}

function viewerOnLoad()//{{{
{
    if ( !viewer.e.is(":visible") ) {
        viewer.e.fadeIn(1000);
    }
    if ( mode() === modes.slideshow ) {
        window.clearTimeout(slideshow_t);
        slideshow_t = slideshow();
    }
    preloadViews();
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
    $(window).keydown(keyPress);

    // mouse
    window.onmousewheel = document.onmousewheel = onMouseWheel;
    window.addEventListener('DOMMouseScroll', onMouseWheel, false);

    // user controls
    if (controls) {
        addAllKeys(controls);
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

    help = new Window(e);

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
    var e;

    if (!help) {
        e = $(".help");
        if (e.length) {
            createHelp(e);
        }
        if (!help) {
            return false;
        }
    }

    help.toggleShow();

    return true;
}//}}}

function saveOptions ()//{{{
{
    options.e.find('.pages .widgetlistitem').each(
        function(){
            var t, which, value, orig_value;
            t = $(this);

            value = t.find(".value").first();
            if ( value.attr('type') === 'checkbox' ) {
                value = value.is(':checked')?1:0;
            } else {
                value = value.val();
            }
            which = t.attr("title");

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
    var ee, e, content, pos;
    ee = $("#copybox");
    e = ee.find(".value");

    content = "config = {\n";
    options.e.find('.pages .widgetlistitem').each(
        function(){
            var t, which, value;
            t = $(this);

            value = t.find(".value").first();
            if ( value.attr("type") === "checkbox" ) {
                value = value.is(":checked");
            } else {
                value = value.val();
                if ( typeof(value) === "string" ) {
                    // escape single quotes and backslash
                    value = "'" + value.replace(/(\\|')/g,"\\$1") + "'";
                }
            }
            which = t.attr("title");

            content += '  ' + which + ': ' + value + ',\n';
        } );
    content += '};'

    ee.css({width:"auto", height:"auto"});
    pos = ee.offset();
    window.scrollTo(pos.left, pos.top);

    ee.slideDown();
    e.text(content);
    e.focus();
    e.select();
}
//}}}

function createOptions(e)//{{{
{
    var i, j, cats, cat, tabs, tab, catname, conf, desc, key, opt, value, input, box, button;

    options = new Window(e);

    tabs = new Tabs();
    options.append(tabs);

    cats = {};
    for (i in configs) {
        // don't change values in config_strict
        if ( i in config_strict ) {
            continue;
        }

        conf = configs[i];
        if (conf.length != 3) {
            continue;
        }
        catname = conf[1];
        if (!catname) {
            continue;
        }

        cat = cats[catname];
        if(!cat) {
            cats[catname] = cat = new WidgetList();
            tabs.append(catname, cat);
        }

        value = getConfig(i);

        // input: text edit OR checkbox
        if ( typeof(value) === "boolean" ) {
            opt = createCheckBox(conf[2], value);
            opt.attr("title", i);
        } else {
            // use textarea when the text has more than 40 characters
            opt = new TextEdit(conf[2], value, typeof(value) === "string" && value.length > 40);
            opt.e.attr("title", i);
        }
        cat.append(opt);
    }

    // config.js contents
    input = new TextEdit("_Add this to your <span class=\"code\">config.js</span>:","",true);
    input.e.attr("id", "copybox").css({width:0, height:0, overflow:"hidden"}).appendTo(e);
    options.append(input);

    // information
    desc = $("<div>", {'class': 'info',
        html:
        '<p>Each entry contains '+
        '<span class="emph">brief description</span>, '+
        '<span class="emph">current option value</span> and '+
        '<span class="emph">keyword</span> (hover mouse pointer over an option) used in URL or the configuration file to set the option.</p>'+
        '<p>To make changes permanent press <span class="emph">Copy</span> button and save the text in configuration file <span class="code">config.js</span>.</p>'
    }).css({width:0, height:0, overflow:"hidden"}).appendTo(e);

    // buttons
    box = new ButtonBox();

    box.append( new Button("_Save",   function(){$(this).blur(); saveOptions();}) );
    box.append( new Button("_Cancel", function(){$(this).blur(); modeDrop();}) );
    box.append( new Button("Co_py",   function(){$(this).blur(); generateConfig();}) );
    box.append( new Button("_Help",   function(){
        var pos;
        if ( desc.height() === 0 ) {
            desc.css({width:"auto", height:"auto"});
            pos = desc.offset();
            window.scrollTo(pos.left, pos.top);
        } else {
            desc.css({width:0, height:0});
        };
    }) );

    options.append(box);
}//}}}

function toggleOptions_()//{{{
{
    var e;

    if (!options) {
        e = $(".options");
        if (e.length) {
            createOptions(e);
        }
        if (!options) {
            return false;
        }
    }

    options.toggleShow();

    // focus tabs
    $(".tabs")[0].focus();

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
        slideshow_t = slideshow();
    } else {
        window.clearTimeout(slideshow_t);
    }

    return true;
}//}}}

function slideshow ()//{{{
{
    var t;
    t = window.setTimeout( function (){
        viewer.e.fadeOut(1000, next);
    }, getConfig('slideshow_delay') );

    return t;
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
                ls.append(key ? key : e.target.result, {'.link': files[i].name});
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
            ls.append( key, {'.link': key.split(';:')[2]} );
        }
    }
}//}}}

function onLoad ()//{{{
{
    var e, preview;

	//if ( ls.length === 0 ) {
		//alert("No items in gallery!");
        //return;
	//}

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

    // shuffle items
    if ( getConfig('shuffle') ) {
        ls.shuffle();
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
        mode(modes.slideshow);
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

    init_GUI();
}//}}}

function onReady ()//{{{
{
    // window elements are hidden before inicialization
    $(".window").hide();
}//}}}

// onLoad & onReady functions initialises gallery
$(document).ready(onReady);

