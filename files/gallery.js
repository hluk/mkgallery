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

// CLASSES//{{{
// drag scrolling
var scrolling = false;

function esc (str) {//{{{
	// don't escape protocols (i.e. "http://" -> "http%3A//"
    if (str.search(/^\w+:\/\//) > -1) {
		return encodeURI(str);
    } else {
		return escape(str);
    }
}//}}}

function createPathElements(dir_e,filename_e,ext_e,path) {//{{{
    var m, dir, filename;

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
    }

    // extension
    if (ext_e.length) {
        ext_e.html( filename.substring(m+1,filename.length) );
    }
}//}}}


// this section should be independent from the rest
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

    this.parent.onUpdateStatus("loading","msg");

    // don't use canvas in some cases:
    //  - user configuration
    //  - GIF: redraw animated images in intervals
    use_canvas = this.parent.getConfig('image_on_canvas', false) &&
        this.path.search(/\.gif$/i) === -1;

    if ( !use_canvas ) {
        e = this.e = this.img = $( document.createElement("img") );
        this.ctx = {
            drawImage: function (img,x,y,width,height) {
                           if( !e.attr("src") ) {
                               e.attr("src", img.src);
                           }
                           e.width = width;
                           e.height = height;
                       }
        };
    } else {
        e = this.e = $( document.createElement("canvas") );
        this.ctx = this.e[0].getContext('2d');
    }

    e.css("display","block");
    e.addClass("imageview");
    e.appendTo(this.parent.e);

    // image element
    if ( !this.img && !use_embed ) {
        e = this.img = $( document.createElement("img") );
    }
    if ( !use_embed ) {
        e.load( function () {
            view.parent.onUpdateStatus(null,"msg");

            view.orig_width = this.width ? this.width : this.naturalWidth;
            view.orig_height = this.height ? this.height : this.naturalHeight;

            view.parent.zoom();
            view.parent.onLoad();
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
        thumbpath = "thumbs/" + this.path.replace(/^items\//,'').replace(/:/g,'_') + ".png";

        thumb = this.thumb = $( document.createElement("img") );
        thumb.addClass("thumbnail " + this.type());

        thumb.load(this.thumbnailOnLoad);
		t = this;
        thumb.error( function () { t.thumbnailOnLoad(true); } );
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

    this.parent.onUpdateStatus( w+"x"+h, "resolution" );
    this.parent.onUpdateStatus( z===1 ? null : Math.floor(z*100), "zoom" );

    this.parent.center();

    return this.width/this.w;
},//}}}

/** events */
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

    p.onUpdateStatus("loading","msg");

	e = this.e = $( document.createElement("video") );
	e.html("Your browser does not support the video tag.");
    e.attr("controls","controls");
    e.css("display","block");
    e.addClass("videoview");
    e.attr("id","video");

	if ( p.getConfig('autoplay',false) ) {
		e.attr("autoplay","autoplay");
    }
	if ( p.getConfig('loop',false) ) {
		e.attr("loop","loop");
    }
	if ( p.getConfig('autonext',false) ) {
		e.bind( "ended", function () {this.parent.next();} );
    }

    e.bind('canplay', function () {
        var s, m;

        view.parent.onUpdateStatus(null,"msg");

        view.orig_width = this.videoWidth;
        view.orig_height = this.videoHeight;
		view.duration = this.duration/60;
		s = Math.floor(this.duration);
		m = Math.floor(s/60);
		s = ""+(s-m*60);
		view.duration = m+":"+(s.length === 1 ? "0" : "")+s;

		view.parent.zoom();
        view.parent.onLoad();
    } );
    e.error( function () {
        view.parent.onUpdateStatus( "Unsupported format!", "error" );
	} );

    e.attr("src",esc(this.path));
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
    this.parent.onUpdateStatus( this.orig_width+"x"+this.orig_height, "resolution" );

    // zoom
    this.parent.onUpdateStatus( this.zoom_factor !== 1 ? null : Math.floor(this.zoom_factor*100), "zoom" );

    // playback speed
    this.parent.onUpdateStatus(
            this.e[0].playbackRate === 1.0 ? null : Math.round(this.e[0].playbackRate*100)/100,"speed" );

    // duration
    this.parent.onUpdateStatus(this.duration, "duration");
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
    this.font = this.path.replace(/[^a-zA-Z0-9_]/g,"_");
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
    e.attr("src", esc(this.path));
    e.addClass("fontview");

    e.attr( "value", this.parent.getConfig('font_test', '+-1234567890, abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, ?!.#$\\/"\'') );
    e.css("font-family",this.font);

    // disable keyboard navigation when textarea focused
    view = this;
    e.focus( function () {
        view.keydown = window.onkeydown;
        view.keypress = window.onkeypress;
        window.onkeydown = function (ev) {
            if (ev.keyCode === 27) {
                view.e.blur();
            }
        };
        window.onkeypress = null;
    } );
    e.blur( function () {
        this.parent.onFontTextChange(this.value);
        window.onkeydown = view.keydown;
        window.onkeypress = view.keypress;
        view.updateHeight();
    } );

    e.appendTo(this.parent.e);
    this.parent.zoom();

    this.parent.onLoad();
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
        var font, p, thumb;
        font = this.path.replace(/.*\//gi, "").replace(".","-");
        p = this.parent;

        thumb = this.thumb = $( document.createElement("div") );
        thumb.addClass("thumbnail " + this.type());
        thumb.css({
                "max-width": p.getConfig('thumbnail_max_width',300) + "px",
                "font-family": this.font
                });
        thumb.html( p.getConfig('thumbnail_font_test',
                    '+-1234567890, abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, ?!.#$\\/"\'') );

        this.thumbnailOnLoad();
    }

    return this.thumb;
},//}}}

zoom: function (how)//{{{
{
    var orig, z, zz;
    orig = this.parent.getConfig('font_size',16);

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
    this.parent.onUpdateStatus( this.e[0].style.fontSize, "fontsize" );
},//}}}

updateHeight: function ()//{{{
{
    var view, e;
    // TODO: better solution
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
    if (filepath.search(/\.(png|jpg|gif|svg)$/i) > -1) {
        return new ImageView(filepath, this.parent);
    } else if (filepath.search(/\.(ttf|otf)$/i) > -1) {
        return new FontView(filepath, this.parent);
    } else if (filepath.search(/\.(mp4|mov|flv|ogg|mp3|wav)$/i) > -1) {
        return new VideoView(filepath, this.parent);
    } else {
        return null;
    }
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
    var t, win;

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

    if (preview.length) {
        this.preview = preview;
        preview.mousedown( function (ev){
                    if (ev.button === 0 && t.previewOnMouseDown) {
                        t.previewOnMouseDown();
                        ev.preventDefault();
                    }
                } );
        win = preview.find(".window");
        if (win.length) {
            this.preview_win = win;
            win.css("position","absolute");
        }
    }

    this.zoom_state = getConfig('zoom','1');

    this.getConfig = getConfig;

    this.viewFactory = new ViewFactory(this);
},//}}}

zoom: function (how)//{{{
{
    var v, ww, wh, w, h, z, zs, zoom_state;

    v = this.view;
    if ( !v ) {
        return;
    }

    // if how is not set -- restore the original
    if (!how) {
        how = this.zoom_state;
    }

    // treat font zoom differently
    if( v.type() === 'font' ) {
        v.zoom(how);
        return;
    }

	ww = window.innerWidth;
	wh = window.innerHeight;
    w = v.orig_width;
    h = v.orig_height;
    z = v.zoom();
    zs = this.getConfig('zoom_step', 0.125);

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

    if ( zoom_state === this.zoom_state ) {
        return;
    }

    this.zoom_state = zoom_state;
    this.onZoomChanged( this.zoom_state );

    // if image doesn't fit in the window
    if ( this.view.type() === "image" &&
         ( window.innerHeight < this.view.e.innerHeight() ||
           window.innerWidth < this.view.e.innerWidth() ) ) {
        this.onTooBig();
    } else {
        this.hidePreview();
    }
},//}}}

createPreview: function (filepath)//{{{
{
    var p, img;

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

    if(!img) {
        img = this.preview_img = $( document.createElement("img") );
        img.appendTo(p);
    }
    img.attr( "src", esc(filepath) );
    p.show();
},//}}}

updatePreview: function (force)//{{{
{
    var img, win, imgw, imgh, ww, wh, w, h, doc;

    img = this.preview_img;
    if ( !img || !img.attr("src") ) {
        return false;
    } else if ( !force && !this.preview.hasClass("focused") ) {
		return true;
    }

    // highlights the part of the image in window
    win = this.preview_win;
    if (win) {
        imgw = img.innerWidth();
        imgh = img.innerHeight();
        ww = window.innerWidth;
        wh = window.innerHeight;
        w = this.view.width;
        h = this.view.height;
        doc = document.documentElement;
        win.css({
                "height": Math.floor( h<wh ? imgh : (imgh*wh/h) ) +"px",
                "width":  Math.floor( w<ww ? imgw : (imgw*ww/w) ) +"px",
                "top":    Math.floor( h<wh ? "0" : imgh*window.pageYOffset/doc.scrollHeight) +"px",
                "left":   Math.floor( w<ww ? "0" : imgw*window.pageXOffset/doc.scrollWidth) +"px"
              });
    }

    return true;
},//}}}

popPreview: function ()//{{{
{
    var preview, t;

    if ( !this.updatePreview(true) ) {
        return;
    }

    if (this.preview_t) {
        window.clearTimeout(this.preview_t);
    }

    preview = this.preview;
    preview.addClass("focused");

    t = this;
    this.preview_t = window.setTimeout(function (){preview.removeClass("focused");},
            this.getConfig('pop_preview_delay',1000));
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
    var v;

    if (this.view) {
        this.view.remove();
    }

    v = this.view = this.viewFactory.newView(filepath);
    if ( v ) {
        v.show();
        this.createPreview(filepath);
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
var ItemList = function (e, items, getConfig) { this.init(e, items, getConfig); };

ItemList.prototype = {
init: function (elem, items, getConfig)//{{{
{
    var t, item, e;

    // itemlist element
    if (!elem) {
        return null;
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
        return null;
    }

    this.ls = items;
    this.len = items.length;
    this.selected = 0;
    this.selection_needs_update = true;

    this.lastpos = [0,0];

    this.viewFactory = new ViewFactory(this);

    this.getConfig = getConfig;
},//}}}

get: function (i)//{{{
{
    return this.items[i];
},//}}}

hidden: function ()//{{{
{
    return !this.e.hasClass("focused");
},//}}}

addThumbnails: function (i)//{{{
{
    var items, thumb_e, item, filename, thumb, t;
    if ( i<0 || i>=this.len ) {
        return;
    }

    items = this.items;

    thumb_e = items[i].find(".thumbnail");
    if (thumb_e.length) {
        item = this.ls[i];
		filename = item instanceof Array ? item[0] : item;
        thumb = this.viewFactory.newView(filename);

        t = this;
        thumb.thumbnailOnLoad = function (error) {
			if (error === true) {
				thumb_e.remove();
            } else {
                thumb_e.css('display','');
            }

            // recursively load thumbnails from currently viewed
            // - flood load:
            //      previous and next thumbnails (from the current) are loaded in parallel
            if (i+1>=this.selected) {
                t.addThumbnails(i+1);
            }
            if (i+1<=this.selected) {
                t.addThumbnails(i-1);
            }
        };

        thumb.thumbnail().appendTo(thumb_e);
    }
},//}}}

newItem: function (i,props)//{{{
{
    var e, item, itemname, tags, w, h, key, t;
    item = this.template;

    // image identification
    e = this.e_ident;
    if (e) {
        e.html(i);
    }

	// get item filename, user tags, width, height
    if (props instanceof Array) {
        itemname = props[0];
        tags = props[1];
		w = props[2];
		h = props[3];
    } else {
        itemname = props;
    }

	// set .thumbnail_width max-width
    e = this.e_w;
	if (e) {
		e.css("max-width",
                w>100 ? w+20 : this.getConfig('thumbnail_max_width',300)+'px');
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
        e = item.find("."+key);
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
                    t.onSubmit(i);
                }
            } );

    return item;
},//}}}

appendItems: function ()//{{{
{
    var e, ls, items, i, item;
    e = this.e;
    ls = this.ls;
    items = this.items = [];

    // avoid changing the document each time item is added
    e.css("display","none");

    for(i=0; i<this.len; i+=1) {
        item = this.newItem(i+1,ls[i]);
        item.appendTo(e);
        items.push(item);
    }

    e.css("display","");
},//}}}

toggle: function ()//{{{
{
    // are items loaded?
	if ( !this.items ) {
        // add items to gallery
        this.appendItems();

        // add thumbnails
        this.thumbs = [];
        this.addThumbnails(this.selected-1);

        this.template.remove();

        // selection cursor
        this.selection = this.e.find(".selection");
        this.selection.css("position","absolute");
    }

    var lastpos2 = [window.pageXOffset,window.pageYOffset];
    this.e.toggleClass("focused");
    window.scrollTo( this.lastpos[0], this.lastpos[1] );
    this.lastpos = lastpos2;

    if ( !this.hidden() ) {
        if ( this.selection_needs_update ) {
            this.updateSelection();
            this.ensureCurrentVisible();
        }
    }
},//}}}

resize: function ()//{{{
{
    this.updateSelection();
},//}}}

ensureCurrentVisible: function ()//{{{
{
    var e, wx, wy, x, y;

    e = this.items[this.selected];
    // TODO: scroll horizontally to item
    wx = window.pageXOffset;

    y = e.position().top;
    if ( y < window.pageYOffset ) {
        window.scrollTo(wx,y);
    }

    y = y + e.innerHeight() - window.innerHeight;
    if ( y > window.pageYOffset ) {
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

selectItem: function (i)//{{{
{
    if (!this.items) {
        this.selected = i;
        return;
    }

    // remove id="selected" from previously selected item
    var sel = this.items[this.selected];
    if(sel) {
        sel.attr("id","");
    }

    this.selected = i;

    this.updateSelection();
    this.ensureCurrentVisible();
},//}}}

listVertically: function (direction)//{{{
{
    var sel, pos, x, y, ny, dist, newdist, i, it, e;

    sel = this.items[this.selected];
    pos = sel.position();
    x = pos.left - window.pageXOffset + sel.innerWidth()/2;
    y = Math.floor(pos.top + sel.innerHeight()/2);
    dist = 99999; // smallest X distance
    newdist = null;

    // select item on next/previous line,
    // item has smallest X distance from curently selected
    it = this.items;
    for( i = this.selected+direction; i < this.len && i >= 0; i+=direction) {
        e = it[i];
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
    if ( i >= this.len ) {
        return;
    }

    // deselect current and select new
    this.selectItem(i);
},//}}}

listLeft: function ()//{{{
{
    // select next
    var i = this.selected-1;
    if ( i < 0 ) {
        return;
    }

    // deselect current and select new
    this.selectItem(i);
},//}}}

listPageDown: function ()//{{{
{
    var min_pos, i;

    min_pos = this.selection.offset().top+window.innerHeight;
    i = this.selected+1;
    while ( i < this.len && min_pos > this.get(i).offset().top ) {
        i += 1;
    }
    this.selectItem(i-1);
},//}}}

listPageUp: function ()//{{{
{
    var min_pos, i;

    min_pos = this.selection.offset().top-window.innerHeight;
    i = this.selected;
    while ( i > 0 && min_pos < this.get(i).offset().top ) {
        i -= 1;
    }
    this.selectItem(i+1);
},//}}}

/** events */
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

    r = this.getConfig('progress_radius',22);
    w1 = this.getConfig('progress_width',8);
    w2 = this.getConfig('progress_inner_width',8);
    shadow = this.getConfig('progress_shadow',10);
    blur = this.getConfig('progress_blur',10);

    ctx = this.progress.getContext("2d");
    pi = 3.1415;
    angle = 2*pi*this.n/this.len;
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
    ctx.strokeStyle = this.getConfig('progress_bg',"rgba(200,200,200,0.4)");
    ctx.moveTo(x, y);
    ctx.beginPath();
    ctx.arc(x, y, r-w1/2, 0, 2*pi, false);
    ctx.stroke();

    // filled part of pie
    ctx.shadowBlur = blur;
    ctx.shadowColor = this.getConfig('progress_fg',"rgba(255,200,0,0.8)");
    ctx.lineWidth = w2;
    ctx.strokeStyle = this.getConfig('progress_fg',"rgba(255,200,0,0.8)");
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
    if (this.itemlink.length) {
        this.itemlink.attr( "href", this.itempath );
    }

    createPathElements(this.dir_e,this.filename_e,this.ext_e,this.href);
},//}}}

updateProperties: function (props)//{{{
{
    var oldprops, key;

    // clear old properties
    oldprops = this.props;
    while( oldprops.length ) {
        this.updateProperty( null, oldprops.pop() );
    }

    // new properties
    for (key in props) {
        this.updateProperty(props[key],key);
    }

},//}}}

updateProperty: function (status_msg, class_name)//{{{
{
    var cls, e;

    cls = class_name ? class_name : "msg";
    e = this.e.find( "." + cls );
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

updateInfo: function (href,i,len,properties)//{{{
{
    this.href = href;
    this.n = i;
    this.len = len;
	this.counter_max.html( len );
    this.counter_now.html(i);
    this.counter_rem.html( len - i );
    this.itempath = esc(href);

    this.updateProgress();
    this.updateItemTitle();
    this.updateProperties(properties);
},//}}}

popInfo: function ()//{{{
{
    if (this.info_t) {
        window.clearTimeout(this.info_t);
    }

    this.e.addClass("focused");

    var t = this;
    this.info_t = window.setTimeout(function (){t.e.removeClass("focused");},
            this.getConfig('pop_info_delay',4000));
},//}}}

hidden: function ()//{{{
{
    return !this.e.hasClass("focused");
},//}}}

/** events */
/** \fn onSubmit(n)
 * \brief event is triggered after selecting item (pressing enter or mouse click)
 * \param n identification of submitted item
 */
onSubmit: function (n){}
};
//}}}
//}}}

// Global variables//{{{
// reset user configuration
var config = {};
var configStrict = {};
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
var itemlist, info, viewer, help;

// image cache
var preloaded = null;

// URL hash timeout
var url_t;

// slideshow timer
var slideshow_t;

var keys = {};
var keydesc;
var modes = {any:"Any", viewer:"Viewer", itemlist:"Item List", help:"Help", slideshow: "Slideshow"};
var mode_stack = [modes.viewer];
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

function len ()//{{{
{
    return ls.length;
}//}}}

function mode ()//{{{
{
    return mode_stack[mode_stack.length-1];
}//}}}

function getConfig (name,default_value)//{{{
{
    var x;

    if ( (x = configStrict[name]) ||
         (x = vars[name])    ||
         (x = config[name]) )
    {
        // value should be same type as the default value
        switch( typeof(default_value) ) {
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
    return i ? Math.min( Math.max(i,1), len() ) : 1;
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

	if ( getConfig("show_events", false) ) {
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

function updateInfo(itemname, n, props) //{{{
{
    if(!info) {
        return;
    }

    info.updateInfo(itemname, n, len(), props);
    signal("info_update");
}//}}}

function updateTitle ()//{{{
{
    var t = getConfig( 'title_fmt', '%{title}: %{now}/%{max} "%{filename}"' );
    t = t.replace( /%\{title\}/g, (title ? title : "untitled") );
    t=t.replace( /%\{now\}/g, n );
    t=t.replace( /%\{remaining\}/g, len()-n );
    t=t.replace( /%\{max\}/g, len() );
    t=t.replace( /%\{filename\}/g, info.name() );
    document.title = t;
}//}}}

function getUrlVars()//{{{
{
    var map, parts;

	map = {};
	parts = location.hash.replace(/[#&]+([^=&]+)=([^&]*)/gi,
        function (m,key,value) {
		    map[key] = value;
	    });
	return map;
}//}}}

function updateClassName()//{{{
{
	b.className = "mode" + mode() + " item" + n + (n === len() ? " last" : "");
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

    maxnum = getConfig('preload_images',2);
    num = maxnum - (n+2) % maxnum;

    new_preloaded = {};
    end = Math.min( n+num, len() );
    begin = Math.max(n-maxnum+num+1,0);
    for(i = begin; i < n; i+=1) {
        new_preloaded[i] = preloaded[i];
    }
    for(i = n; i < end; i+=1) {
        // try to use already preloaded image
        im = preloaded[i];
        if ( !im ) {
            // type of item must be image
			item = this.ls[i];
            filename = item instanceof Array ? item[0] : item;
            view = ViewFactory.prototype.newView(filename);
            if (!view || view.type() !== "image") {
                continue;
            }

            // create image
            im = new Image();
            im.src = esc(filename);

            // since we access the disk (read the image) we can also
            // change the url - browser saves history
            updateUrl(1000);
        }
        new_preloaded[i] = im;
    }
    preloaded = new_preloaded;
}//}}}

function toggleList()//{{{
{
    if (itemlist) {
        itemlist.toggle();
        if ( itemlist.hidden() ) {
            mode_stack.pop();
        } else if ( mode_stack[0] !== modes.itemlist ) {
            mode_stack.push(modes.itemlist);
        }
		updateClassName();
    }
}//}}}

function scroll (x,y,absolute)//{{{
{
    var oldx, oldy, newx, newy;

    if (!viewer) {
        return false;
    }

    oldx = window.pageXOffset;
    oldy = window.pageYOffset;
	if (absolute) {
		window.scrollTo(x,y);
    } else {
		window.scrollBy(x,y);
    }

    newx = window.pageXOffset;
    newy = window.pageYOffset;
    if ( newy !== oldy ) {
        signal("scroll");

        if (newy === 0) {
            signal("top");
        }
        if (newy+window.innerHeight >= document.documentElement.scrollHeight) {
            signal("bottom");
        }

        return true;
    } else if ( newx !== oldx ) {
        signal("scroll");

        if (newx === 0) {
            signal("leftmost");
        }
        if (newx+window.innerWidth >= document.documentElement.scrollWidth) {
            signal("rightmost");
        }

        return true;
    } else {
        return false;
    }
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
    var pg, r, item, itemname, props;

    pg = getPage(i);

    n = vars.n = pg;

    // TODO: fix memory leaks!!!
    // reload window on every nth item
    r = getConfig('reload_every');
    if (r) {
        if (count_n > 0 && r && count_n%r === 0 && mode() !== modes.slideshow) {
            count_n = 0;
            updateUrl();
            location.reload();
            return;
        } else {
            count_n += 1;
        }
    }

    // hide item list and select current item
    if ( itemlist ) {
        if ( !itemlist.hidden() ) {
            toggleList();
        }
        itemlist.selectItem(i-1);
    }

	item = ls[pg-1];
	if (item instanceof Array) {
		itemname = item[0];
		props = item[1];
	} else {
		itemname = item;
    }

    updateInfo(itemname, n, props);

    updateTitle();
	updateUrl(1000);
	updateClassName();

    viewer.show(itemname);

    window.scrollTo(0,0);

    signal("go");
    if ( n === 1 ) {
        signal("first");
    }
    if ( n === len() ) {
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
    if (!viewer) {
        return false;
    }

    viewer.popPreview();
    return true;
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
    if ( n === len() ) {
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

	if ( getConfig("show_keys", false) ) {
		info.updateProperty("key: " + keyname + " ("+keycode+")");
        popInfo();
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
            tt = t+25;
            if ( mode() === modes.viewer ) {
                viewer.updatePreview();
            }
        }
        return (t=t/1000-1)*t*t + 1;
    }
});

function dragScroll (t,p)
{
    var x, y, z, w, win, start, d, dx, dy;

    function continueDragScroll(e) {
        var t, pos;

        scrolling = true;
        if(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        }

        t = new Date().getTime();
		//info.updateProperty( (oldy-mouseY)/(t-start) );
		//info.popInfo();
		if (t-start > 100) {
			start = t;
			dx[d] = mouseX;
			dy[d] = mouseY;
			d = d?0:1;
		}

        if (p) {
            pos = p.position();
            scroll( z*(mouseX+window.pageXOffset-x-pos.left),
                    z*(mouseY+window.pageYOffset-y-pos.top), true );
        } else {
            scroll(x-mouseX,y-mouseY,true);
        }

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

        accel = getConfig('slide_scroll',100)/(new Date().getTime()-start);
        vx = (dx[d]-mouseX)*accel;
        vy = (dy[d]-mouseY)*accel;

        tt = mode() === modes.viewer ? 50 : 1000;
        $('html,body').animate({
            scrollLeft: window.pageXOffset+vx+"px",
            scrollTop: window.pageYOffset+vy+"px"
            }, 1000, "easeOutCubic");

        signal("drag_scroll_end");
        e.preventDefault();
    }

    w = $(window);

    if (p) {
        win = p.find(".window");
        x = win.innerWidth()/2;
        y = win.innerHeight()/2;
        z = t.innerHeight()/p.innerHeight();
        continueDragScroll();
    }
    else {
        x = window.pageXOffset + mouseX;
        y = window.pageYOffset + mouseY;
    }

    $('html,body').stop(true);
    w.mouseup(stopDragScroll);
    w.mousemove(continueDragScroll);

    start = new Date().getTime()-100;
	d = 0;
    dx = [mouseX,mouseX];
    dy = [mouseY,mouseY];
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
            info.updateProperty( msg, "error" );
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

    if ( preview.length ) {
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
        cat = $( document.createElement("div") );
        cat.addClass('category');
        cat.appendTo(e);

        $('<h3>'+modes[i]+'</h3>').appendTo(cat);

        modekeydesc = keydesc[modes[i]];
        for (j in modekeydesc) {
            key = $( document.createElement("div") );
            key.addClass("key");
            key.appendTo(cat);

            $('<div class="which">'+modekeydesc[j].join(", ")+'</div>').appendTo(key);
            $('<div class="desc">'+j+'</div>').appendTo(key);
        }
    }
}//}}}

function createConfigHelp(e)//{{{
{
    var confdesc, i, j, cat, desc, opt;

    // configuration//{{{
    confdesc = {
        "Images": {
        'zoom_step': "zoom multiplier",
        'preload_images': "number of images to preload"
        },

        "Font": {
        'font_size': "font size",
        'font_test': "default text"
        },

        "Progress bar": {
        'progress_radius': "radius",
        'progress_width': "circle stroke width (background)",
        'progress_inner_width': "circle stroke width (foreground)",
        'progress_bg': "background color",
        'progress_fg': "foreground color",
        'progress_blur': "blur amount",
        'progress_shadow': "shadow size"
        },

        "Thumbnail": {
        'thumbnail_min_width': "minimum width",
        'thumbnail_max_width': "maximum width",
        'thumbnail_font_test': "default text for fonts"
        },

		"Audio/Video": {
		'autoplay': "Play audio/video when viewed",
		'loop': "Replay when playback ends",
		'autonext': "Go to next item whed playback ends"
		}
    };//}}}

    for (i in confdesc) {
        cat = $( document.createElement("div") );
        cat.addClass('category');
        cat.appendTo(e);

        $('<h3>'+i+'</h3>').appendTo(cat);

        desc = confdesc[i];
        for (j in desc) {
            opt = $( document.createElement("div") );
            opt.addClass("option");
            opt.appendTo(cat);

            $('<div class="which">'+j+'</div>').appendTo(opt);
            $('<div class="desc">'+confdesc[i][j]+'</div>').appendTo(opt);
        }
    }
}//}}}

function createAbout(e)//{{{
{
    var content, i, x, cat;

    content = [
        ["gallery created with","mkgallery v1.0"],
        ["author","Lukáš Holeček"],
        ["e-mail",'<a href="mailto:hluk@email.cz">hluk@email.cz</a>']
    ];

    for (i in content) {
        x = content[i];
        cat = $( document.createElement("div") );
        cat.addClass("category");
        cat.appendTo(e);

        $('<div class="which">'+x[0]+'</div>').appendTo(cat);
        $('<div class="desc">'+x[1]+'</div>').appendTo(cat);
    }
}//}}}

function createHelp(e)//{{{
{
    var ekeys, econf, eother;

    ekeys = e.find(".keys");
    if (ekeys.length) {
        createKeyHelp(ekeys);
    }

    econf = e.find(".options");
    if (econf.length) {
        createConfigHelp(econf);
    }

    eother = e.find(".about");
    if (eother.length) {
        createAbout(eother);
    }
}//}}}

function toggleHelp()//{{{
{
    // key bindings
    if (!help) {
        help = $(".help");
        if (!help.length) {
            return;
        }
        createHelp(help);
    }

    if ( help.length ) {
        if ( help.hasClass("focused") ) {
            help.removeClass("focused");
            mode_stack.pop();
        }
        else {
            help.addClass("focused");
            mode_stack.push(modes.help);
        }
		updateClassName();
    }
}//}}}

function onResize()//{{{
{
    if (viewer) {
        viewer.zoom();
    }
    if (itemlist) {
        itemlist.resize();
    }
    signal("resize");
}//}}}

function exit_slideshow()//{{{
{
    if ( mode() !== modes.slideshow ) {
        return;
    }

    mode_stack.pop();
    if (slideshow_t) {
        window.clearTimeout(slideshow_t);
    }
}//}}}

function slideshow()//{{{
{
    zoom('fit');
    if ( mode() !== modes.slideshow ) {
        mode_stack.push(modes.slideshow);
    }
    slideshow_t = window.setTimeout( function (){
                viewer.e.fadeOut(1000, next);
                slideshow();
            }, getConfig('slideshow_delay', 8000) );
}//}}}

function onLoad()//{{{
{
    var e;

	if ( len() === 0 ) {
		alert("No items in gallery!");
		return;
	}

    b = document.getElementsByTagName("body")[0];

    // get URL variables
    vars = getUrlVars();
    n = getPage( getConfig('n',0) );
    count_n = 0;

    // capture mouse position
    mouseX = mouseY = 0;
    $(document).mousemove(function (e){
            mouseX = e.clientX;
            mouseY = e.clientY;
            });

    // no scrollbars
    document.body.style.overflow = "hidden";

    // item list
    createItemList();

    // info
    e = $('#info');
    if (e) {
        info = new Info(e, getConfig);
    }

    // viewer
    e = $('#canvas');
    if (e.length) {
        createViewer(e,$('.preview'),info);
    }

    // refresh zoom on resize
    window.onresize = onResize;

    // browser with sessions: update URL when browser window closed
    b.onbeforeunload = function () { updateUrl(); };

    // navigation
    createNavigation();

    signal('load');

    go(n);

    if ( getConfig('slideshow') ) {
        slideshow();
    }
}//}}}

