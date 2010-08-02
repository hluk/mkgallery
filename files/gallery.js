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

//! \class Viewer
//{{{
var Viewer = function(e,preview,zoom) {
    this.init(e,preview,zoom);
};

Viewer.prototype = {
init: function (e,preview,zoom)//{{{
{
    this.e = e;
    e.mousedown( function(ev){
                if (ev.button == 0) {
                    signal("view_mouse_down")
                    ev.preventDefault();
                }
            } );

    if (preview.length) {
        this.preview = preview;
        preview.mousedown( function(ev){
                    if (ev.button == 0) {
                        signal("preview_mouse_down")
                        ev.preventDefault();
                    }
                } );
        var win = preview.find(".window");
        if (win.length) {
            this.preview_win = win;
            win.css("position","absolute");
        }
    }
    this.zoom_state = zoom ? zoom : 1;
    this.viewFactory = new ViewFactory(this);
},//}}}

zoom: function (how)//{{{
{
    if ( !this.view )
        return;

    this.view.zoom(how ? how : this.zoom_state);
},//}}}

zoomChanged: function (zoom_state,zoom_factor)//{{{
{
    var z;

    switch(zoom_state) {
    case "fit":
    case "fill":
        z = zoom_state;
        break;
    default:
        z = zoom_factor;
        break;
    }

    if ( this.zoom_state != z ) {
        this.zoom_state = z;
        if (this.onZoomChanged)
            this.onZoomChanged(z);
    }

    if ( signal && this.view.type() == "image" &&
         ( window.innerHeight < this.view.e.innerHeight() ||
           window.innerWidth < this.view.e.innerWidth() ) )
        signal("too_big");
    else
        this.hidePreview();
},//}}}

createPreview: function(filepath)//{{{
{
    var p = this.preview;
    if (!p)
        return;

    var img = this.preview_img;

    // remove preview if item is not an image
    if ( this.view.type() != "image" ) {
        if (img)
            img.attr( "src", "" );
        p.hide();
        return;
    }

    if(!img) {
        img = this.preview_img = $("<img></img>");
        img.appendTo(p);
    }
    img.attr( "src", esc(filepath) );
    p.show();
},//}}}

updatePreview: function()//{{{
{
    var img = this.preview_img;
    if ( !(img && img.attr("src")) )
        return false;

    // highlights the part of the image in window
    var win = this.preview_win;
    if (win) {
        var imgw = img.innerWidth();
        var imgh = img.innerHeight();
        var ww = window.innerWidth;
        var wh = window.innerHeight;
        var w = this.view.width;
        var h = this.view.height;
        var doc = document.documentElement;
        win.css({
                "height": Math.floor( h<wh ? imgh : (imgh*wh/h) ) +"px",
                "width":  Math.floor( w<ww ? imgw : (imgw*ww/w) ) +"px",
                "top":    Math.floor( h<wh ? "0" : imgh*window.pageYOffset/doc.scrollHeight) +"px",
                "left":   Math.floor( w<ww ? "0" : imgw*window.pageXOffset/doc.scrollWidth) +"px",
              });
    }

    return true;
},//}}}

popPreview: function()//{{{
{
    if ( !this.updatePreview() )
        return;

    if (this.preview_t)
        clearTimeout(this.preview_t);

    var p = this.preview;
    p.addClass("focused");

    var t = this;
    this.preview_t = window.setTimeout(function(){p.removeClass("focused");},
            getConfig('pop_preview_delay',1000));
},//}}}

hidePreview: function()//{{{
{
    var p = this.preview;
    if (!p)
        return;

    if (this.preview_t) {
        clearTimeout(this.preview_t);
        p.removeClass("focused");
    }
},//}}}

center: function()//{{{
{
    // center item in window
    var newtop = ( window.innerHeight - this.view.e.innerHeight() )/2;
    this.view.e.css("margin-top",(newtop > 0 ? newtop : 0) + "px");
},//}}}

show: function (filepath)//{{{
{
    if (this.view)
        this.view.remove();

    var v = this.view = this.viewFactory.newView(filepath);
    if ( v ) {
        v.show();
        this.createPreview(filepath);
    }
    else if (this.onError)
        this.onError("Unknown format: \""+filepath+"\"");
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
onUpdateStatus: function(msg,class_name){},

/** \fn onLoad()
 * \brief event is triggered after item is successfully loaded
 */
onLoad: function(){},

/** \fn onError(error_msg);
 * \brief event is triggered after error
 */
onError: function(error_msg){},

/** \fn onZoomChanged(zoom_state)
 * \brief event is triggered after zoom is changed
 * \param zoom_state "fit", "fill" or zoom factor (float)
 */
onZoomChanged: function(zoom_state){},
}
//}}}

//! \class ViewFactory
//{{{
var ViewFactory = function(_parent) {
    this.init(_parent);
};

ViewFactory.prototype = {
init: function(_parent) {//{{{
      this._parent = _parent;
},//}}}

newView: function(filepath) {//{{{
    if (filepath.search(/\.(png|jpg|gif)$/i) > -1)
        return new ImageView(filepath, this._parent);
    else if (filepath.search(/\.(ttf|otf)$/i) > -1)
        return new FontView(filepath, this._parent);
    else if (filepath.search(/\.(mp4|mov|flv|ogg|mp3|wav)$/i) > -1)
        return new VideoView(filepath, this._parent);
    else
        return null;
},//}}}
}
//}}}

//! \interface ItemView
//{{{
/**
 * \fn init(itempath, _parent)
 * \param itempath item filename
 * \param _parent item parent (Viewer)
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
 * \param how "fit" (fit to window), "fill" (fill window), float (zoom factor), other (restore default zoom factor)
 *
 * \fn onZoomChange()
 * \brief event
 */
//}}}

//! \class ImageView
//! \implements ItemView
//{{{
var ImageView = function(imgpath, _parent) { this.init(imgpath, _parent); };

ImageView.prototype = {
init: function(imgpath, _parent)//{{{
{
    this.path = imgpath;
    this._parent = _parent;
    this.zoom_factor = 1;
},//}}}

type: function ()//{{{
{
    return "image";
},//}}}

show: function()//{{{
{
    var view = this;

    if ( this.e )
        return;

    this._parent.onUpdateStatus("loading","msg");

    // TODO: SVG -- for some reason this doesn't work in Chromium
	/*
	if (this.path.search(/\.svg$/i) > -1) {
		this.e = document.createElement("embed");
	}
	else {
		this.e = document.createElement("img");
	}
	*/

    var e;
    // don't use canvas in some cases:
    //  - user configuration
    //  - GIF: redraw animated images in intervals
    //  - Opera
    if ( !getConfig('image_on_canvas',false) || userAgent() == userAgents.opera || this.path.search(/\.gif$/i) > -1) {
        e = this.e = $("<img></img>");
        this.ctx = {
            drawImage: function (img,x,y,width,height) {
                           if( !e.attr("src") );
                               e.attr("src",img.src);
                           e.width = width;
                           e.height = height;
                       },
        }
    }
    else {
        e = this.e = $("<canvas></canvas>");
        this.ctx = this.e[0].getContext('2d');
    }
    e.css("display","block");
    e.addClass("imageview");
    e.appendTo(this._parent.e);

    var img = this.img = $("<img></img>");
    img.attr("id","img");
    img.attr("src",esc(this.path));
    img.load( function () {
        view._parent.onUpdateStatus(null,"msg");

        view.orig_width = this.width ? this.width : this.naturalWidth;
        view.orig_height = this.height ? this.height : this.naturalHeight;

        view._parent.zoom();
        view._parent.onLoad();
    } );
},//}}}

remove: function()//{{{
{
    var e = this.e;
    if ( e )
        e.remove();
},//}}}

thumbnail: function()//{{{
{
    if ( !this.thumb ) {
        var thumbpath = "thumbs/" + this.path.replace(/^.*[\/\\]/,'') + ".png";

        thumb = this.thumb = $('<img></img>');
        thumb.addClass("thumbnail " + this.type());

        thumb.load(this.thumbnailOnLoad);
		var t = this;
        thumb.error( function() { t.thumbnailOnLoad(true); } );
        thumb.attr( "src", esc(thumbpath) );
    }

    return this.thumb;
},//}}}

zoom: function (how)//{{{
{
	var ww = window.innerWidth;
	var wh = window.innerHeight;
    var w = this.orig_width;
    var h = this.orig_height;

    var z = this.zoom_factor;

    switch(how) {
    case "+":
        if ( z > zoom_step )
            z += zoom_step;
        else
            z *= 4;
        break;
    case "-":
        if ( z > zoom_step )
            z -= zoom_step;
        else
            z *= 0.8;
        break;
    case "fit":
		if (w > ww || h > wh)
			z = ( ww*h < wh*w ) ? ww/w : wh/h;
		else
			z = 1;
        break;
    case "fill":
        z = ( ww*h < wh*w ) ? wh/h : ww/w;
        break;
    default:
        z = how ? parseFloat(how) : 1;
        break;
    }

    // clear canvas
    if(this.width && this.ctx.clearRect)
        this.ctx.clearRect(0,0,this.width,this.height);

    this.width = this.e[0].width = w*z;
    this.height = this.e[0].height = h*z;

    // redraw image
    this.ctx.drawImage(this.img[0],0,0,this.width,this.height);
    this.zoom_factor = z;

    this._parent.onUpdateStatus( this.orig_width+"x"+this.orig_height, "resolution" );
    this._parent.onUpdateStatus( z==1 ? null : Math.floor(z*100), "zoom" );

    this._parent.zoomChanged(how,this.zoom_factor);
    this._parent.center();
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 * \param error true if error occured
 */
thumbnailOnLoad: function(error){},
}
//}}}

//! \class VideoView
//! \implements ItemView
//{{{
var VideoView = function(vidpath, _parent) { this.init(vidpath, _parent); };

VideoView.prototype = {
init: function(vidpath, _parent)//{{{
{
    this.path = vidpath;
    this._parent = _parent;
    this.zoom_factor = 1;
},//}}}

type: function ()//{{{
{
    return "video";
},//}}}

show: function()//{{{
{
    var view = this;

    if ( this.e )
        return;

    this._parent.onUpdateStatus("loading","msg");

	e = this.e = $("<video></video>");
	e.html("Your browser does not support the video tag.");
    e.attr("controls","controls");
    e.css("display","block");
    e.addClass("videoview");
    e.attr("id","video");

	if ( getConfig('autoplay',false) )
		e.attr("autoplay","autoplay");
	if ( getConfig('loop',false) )
		e.attr("loop","loop");
	// TODO: onended event doesn't work -- WHY?
	if ( getConfig('autonext',false) && next )
		e.bind("ended",next);

    e.bind('canplay', function () {
        view._parent.onUpdateStatus(null,"msg");

        view.orig_width = this.videoWidth;
        view.orig_height = this.videoHeight;
		view.duration = this.duration/60;
		var s = Math.floor(this.duration);
		var m = Math.floor(s/60);
		s = ""+(s-m*60);
		view.duration = m+":"+(s.length == 1 ? "0" : "")+s;

		view._parent.zoom();
        view._parent.onLoad();
    } );
    e.error( function () {
        view._parent.onUpdateStatus( "Unsupported format!", "error" );
	} );

    e.attr("src",esc(this.path));
    e.appendTo(this._parent.e);
},//}}}

remove: function()//{{{
{
    var e = this.e;
    if ( e )
        e.remove();
},//}}}

thumbnail: function()//{{{
{
    if ( !this.thumb ) {
        thumb = this.thumb = $('<div></div>');
        thumb.addClass("thumbnail " + this.type());

        this.thumbnailOnLoad();
    }

    return this.thumb;
},//}}}

zoom: function (how)//{{{
{
	var ww = window.innerWidth;
	var wh = window.innerHeight;

    if(!this.orig_width) {
		this.width = this.e[0].width = ww;
		this.height = this.e[0].height = wh/2;
        this.updateStatus();
		return;
	}

    var w = this.orig_width;
    var h = this.orig_height;

    var z = this.zoom_factor;

    switch(how) {
    case "+":
        if ( z > zoom_step )
            z += zoom_step;
        else
            z *= 4;
        break;
    case "-":
        if ( z > zoom_step )
            z -= zoom_step;
        else
            z *= 0.8;
        break;
    case "fit":
		z = ( ww*h < wh*w ) ? ww/w : wh/h;
        break;
    case "fill":
        z = ( ww*h < wh*w ) ? wh/h : ww/w;
        break;
    default:
        z = how ? parseFloat(how) : 1;
        break;
    }

    this.width = this.e[0].width = w*z;
    this.height = this.e[0].height = h*z;
    this.zoom_factor = z;

    this.updateStatus();

    this._parent.zoomChanged(how,this.zoom_factor);
    this._parent.center();
},//}}}

updateStatus: function()//{{{
{
    // resolution
    this._parent.onUpdateStatus( this.orig_width+"x"+this.orig_height, "resolution" );

    // zoom
    this._parent.onUpdateStatus( this.zoom_factor != 1 ? null : Math.floor(this.zoom_factor*100), "zoom" );

    // playback speed
    this._parent.onUpdateStatus(
            this.e[0].playbackRate == 1.0 ? null : Math.round(this.e[0].playbackRate*100)/100,"speed" );

    // duration
    this._parent.onUpdateStatus(this.duration, "duration");
},//}}}

normalSpeed: function()//{{{
{
    this.e[0].playbackRate = 1;
    this.updateStatus();
},//}}}

faster: function()//{{{
{
    this.e[0].playbackRate += 0.1;
    this.updateStatus();
},//}}}

slower: function()//{{{
{
    this.e[0].playbackRate -= 0.1;
    this.updateStatus();
},//}}}

togglePlay: function()//{{{
{
    this.e[0].paused ? this.e[0].play() : this.e[0].pause();
},//}}}

seek: function(how) {//{{{
    this.e[0].currentTime += how;
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 */
thumbnailOnLoad: function(){},
}
//}}}

//! \class FontView
//! \implements ItemView
//{{{
var FontView = function(itempath, _parent) { this.init(itempath, _parent); };

FontView.prototype = {
init: function(itempath, _parent)//{{{
{
    this.path = itempath;
    this._parent = _parent;
    this.zoom_factor = 1;
    this.font = this.path.replace(/[^a-zA-Z0-9_ ]/g,"_");
	this.width = this.height = 0;
},//}}}

type: function ()//{{{
{
    return "font";
},//}}}

show: function()//{{{
{
    if (this.e)
        return;

    e = this.e = $('<textarea></textarea>');
    e.attr("src", esc(this.path));
    e.addClass("fontview");

    e.attr( "value", getConfig('font_test', '+-1234567890, abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, ?!.#$\\/"\'') );
    e.css("font-family",this.font);

    // disable keyboard navigation when textarea focused
    var view = this;
    e.focus( function () {
        view.keydown = document.onkeydown;
        view.keypress = document.onkeypress;
        document.onkeydown = function(ev){
            if(ev.keyCode == 27)
                view.e.blur();
        };
        document.onkeypress = null;
    } );
    e.blur( function () {
        config['font_test'] = this.value;
        document.onkeydown = view.keydown;
        document.onkeypress = view.keypress;
        view.updateHeight();
    } );

    e.appendTo(this._parent.e);
    this._parent.zoom();

    this._parent.onLoad();
},//}}}

remove: function()//{{{
{
    var e = this.e;
    if ( e )
        e.remove();
},//}}}

thumbnail: function()//{{{
{
    if ( !this.thumb ) {
        var font = this.path.replace(/.*\//gi, "").replace(".","-");

        thumb = this.thumb = $('<div></div>');
        thumb.addClass("thumbnail " + this.type());
        thumb.css({
                "max-width": getConfig('thumbnail_max_width',300) + "px",
                "font-family": this.font
                });
        thumb.html( getConfig('thumbnail_font_test',
                    '+-1234567890, abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, ?!.#$\\/"\'') );

        this.thumbnailOnLoad();
    }

    return this.thumb;
},//}}}

zoom: function (how)//{{{
{
    var orig = getConfig('font_size',16);

    if ( !this.orig_height )
        this.orig_height = this.e.offsetHeight;

    var z = this.zoom_factor;
    var zz = Math.ceil(z*orig);

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
        if (!z)
            z = 1;
        zz = Math.ceil(z*orig);
        break;
    }

    this.e.css("font-size",zz+"pt");
    this.updateHeight();

    this.zoom_factor = z;

    this._parent.zoomChanged(how,this.zoom_factor);
    this._parent.center();

    // for firefox this.e.css("font-size") is "...px"
    this._parent.onUpdateStatus( this.e[0].style.fontSize, "fontsize" );
},//}}}

updateHeight: function()//{{{
{
    // TODO: better solution
    var view = this;
    var e = this.e;
    e.hide();
    e.css("height","50%");
    window.setTimeout(
        function(){
            e.show();
            e.css("height",e[0].scrollHeight+"px");
            view._parent.center(e.innerHeight());
        },10);
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 */
thumbnailOnLoad: function(){},
}
//}}}

//! \class ItemList
//{{{
var ItemList = function(e,items) { this.init(e,items); };

ItemList.prototype = {
init: function (e,items)//{{{
{
    // itemlist element
    this.e = e;
    if (!this.e)
        return null;

    // item template element
    var item = this.template = e.find(".item");
    var e;
    if (this.template.length) {
        e = item.find(".itemident");
        if (e.length)
            this.e_ident = e;

        e = item.find(".thumbnail_width");
        if (e.length)
            this.e_w = e;

        this.e_dir = item.find(".directory");
        this.e_filename = item.find(".filename");
        this.e_ext = item.find(".extension");

        e = item.find(".thumbnail");
        if (e.length)
            this.e_thumb = e;
    }
    else
        return null;

    this.ls = items;

    this.lastpos = [0,0];

    this.viewFactory = new ViewFactory(this);
},//}}}

get: function(i)//{{{
{
    return this.items[i];
},//}}}

hidden: function()//{{{
{
    return !this.e.hasClass("focused");
},//}}}

size: function ()//{{{
{
    return this.items.length;
},//}}}

addThumbnails: function (i)//{{{
{
    if ( i == null )
        i = n-1;
    if ( i<0 || i>=len )
        return;

    items = this.items;

    var thumb_e = items[i].find(".thumbnail");
    if (thumb_e.length) {
        var item = this.ls[i];
		var filename = item instanceof Array ? item[0] : item;
        var thumb = this.viewFactory.newView(filename);

        var t = this;
        thumb.thumbnailOnLoad = function(error) {
			if (error !== true)
				thumb_e.css("display","");
            // recursively load thumbnails from currently viewed
            // - flood load:
            //      previous and next thumbnails (from the current) are loaded in parallel
            if (i+1>=n)
                t.addThumbnails(i+1);
            if (i+1<=n)
                t.addThumbnails(i-1);
        };

        thumb.thumbnail().appendTo(thumb_e);
    }
},//}}}

newItem: function (i,props)//{{{
{
    var e;
    var item = this.template;

    // image identification
    e = this.e_ident;
    if (e)
        e.html(i);

	// get item filename, user tags, width, height
    var itemname, tags, w, h;
    if (props instanceof Array) {
        itemname = props[0];
        tags = props[1];
		w = props[2];
		h = props[3];
    }
    else
        itemname = props;

	// set .thumbnail_width max-width
    e = this.e_w;
	if (e)
		e.css("max-width",(w>100 ? w+20 : getConfig('thumbnail_max_width',300)) +"px");

    // filename
    createPathElements(
        this.e_dir,
        this.e_filename,
        this.e_ext,
        itemname);

	// thumbnail size
    e = this.e_thumb;
	if (e)
        e.css({
				"display": (w && h) ? "" : "none",
				"width": w ? w+"px" : "",
				"height": h ? h+"px" : ""
			});

    // user tags
    if (tags) {
        for (var key in tags) {
            e = item.find("."+key);
            var v = tags[key];
            if (v)
                e.html(v);
            else
                e.hide();
        }
    }

    // clone item
    item = item.clone();

    // mouse click event
    var t = this;
    item.click( function() {
        t.onSubmit(i);
    });

    return item;
},//}}}

appendItems: function()//{{{
{
    var e = this.e;
    var ls = this.ls;
    var items = this.items = [];

    // avoid changing the document each time item is added
    e.css("display","none");

    for(var i=0; i<len; ++i) {
        var item = this.newItem(i+1,ls[i]);
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
        this.addThumbnails();

        this.template.remove();

        // selection cursor
        this.selection = this.e.find(".selection");
        this.selection.css("position","absolute");

        // select current
        this.selectItem(n-1);
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
    var e = this.items[this.selected];
    // TODO: scroll horizontally to item
    var y = e.position().top;
    var d = y + e.innerHeight() - window.pageYOffset - window.innerHeight;
    if ( d > 0 )
        window.scrollBy(0,d);
    if ( y < window.pageYOffset )
        window.scrollTo(window.pageXOffset,y);
},//}}}

updateSelection: function ()//{{{
{
    if ( this.hidden() )
        this.selection_needs_update = true;
    else {
        this.selection_needs_update = false;

        var e = this.items[this.selected];

        e.attr("id","selected");

        var pos = e.offset();

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
    if (!this.items)
        return;

    // remove id="selected" from previously selected item
    var sel = this.items[this.selected];
    if(sel)
        sel.attr("id","");

    this.selected = i;

    this.updateSelection();
    this.ensureCurrentVisible();
},//}}}

listVertically: function (direction)//{{{
{
    var sel = this.items[this.selected];
    var pos = sel.position();
    var x = pos.left - window.pageXOffset + sel.innerWidth()/2;
    var y = Math.floor(pos.top + sel.innerHeight()/2);
    var ny
    var dist = 99999; // smallest X distance
    var newdist;

    // select item on next/previous line,
    // item has smallest X distance from curently selected
    var i;
    var it = this.items;
    for( i = this.selected+direction, len = it.length; i < len && i >= 0; i+=direction) {
        var e = it[i];
        pos = e.position();

        if ( newdist == null ) {
            ny = pos.top + e.innerHeight()/2;
            if ( (direction > 0 && ny-y < 10) || (direction < 0 && y-ny < 10) )
                continue;
        }
        else if( ny - pos.top - e.innerHeight()/2 > 10 )
            break;

        var newdist = Math.abs( pos.left + e.innerWidth()/2 - x );
        if ( newdist > dist )
            break;

        dist = newdist;
    }

    // no new line encountered
    if (newdist == null)
        return;

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
    if ( i >= this.items.length )
        return;

    // deselect current and select new
    this.selectItem(i);
},//}}}

listLeft: function ()//{{{
{
    // select next
    var i = this.selected-1;
    if ( i < 0 )
        return;

    // deselect current and select new
    this.selectItem(i);
},//}}}

listPageDown: function ()//{{{
{
    var min_pos = this.selection.offset().top+window.innerHeight;
    var i = this.selected;
    while ( ++i < len && min_pos > this.get(i).offset().top );
    this.selectItem(i-1);
},//}}}

listPageUp: function ()//{{{
{
    var min_pos = this.selection.offset().top-window.innerHeight;
    var i = this.selected;
    while ( --i > 0 && min_pos < this.get(i).offset().top );
    this.selectItem(i+1);
},//}}}
}
//}}}

//! \class Info
//{{{
var Info = function(e) {
    this.init(e);
};

Info.prototype = {
init: function(e)//{{{
{
    this.e = e;

	this.itemlink = e.find(".itemlink");

    this.status = e.find(".status");

    this.progress = e.find(".progress")[0];
    this.counter = e.find(".counter");
    this.counternow = e.find(".counternow");
    this.countermax = e.find(".countermax");

    this.dir_e = e.find(".directory");
    this.filename_e = e.find(".filename");
    this.ext_e = e.find(".extension");
},//}}}

updateProgress: function ()//{{{
{
    if ( !this.progress )
        return;

    var r = getConfig('progress_radius',22);
    var w1 = getConfig('progress_width',8);
    var w2 = getConfig('progress_inner_width',8);
    var shadow = getConfig('progress_shadow',10);
    var blur = getConfig('progress_blur',10);

    var ctx = this.progress.getContext("2d");
    var pi = 3.1415;
    var angle = 2*pi*this.n/this.len;
    var x = r+blur/2;
    var y = r+blur/2;

    this.progress.setAttribute("width", r*2+blur);
    this.progress.setAttribute("height", r*2+blur);

    ctx.save();

    //ctx.clearRect(x-r,y-r,2*r,2*r);

    // empty pie
    ctx.shadowBlur = shadow;
    ctx.shadowColor = "black";
    ctx.lineWidth = w1;
    ctx.strokeStyle = getConfig('progress_bg',"rgba(200,200,200,0.4)");
    ctx.moveTo(x, y);
    ctx.beginPath();
    ctx.arc(x, y, r-w1/2, 0, 2*pi, false);
    ctx.stroke();

    // filled part of pie
    ctx.shadowBlur = blur;
    ctx.shadowColor = getConfig('progress_fg',"rgba(255,200,0,0.8)");
    ctx.lineWidth = w2;
    ctx.strokeStyle = getConfig('progress_fg',"rgba(255,200,0,0.8)");
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
    if (this.itemlink.length)
        this.itemlink.attr( "href", this.itempath );

    createPathElements(this.dir_e,this.filename_e,this.ext_e,this.href);
},//}}}

updateProperties: function ()//{{{
{
    // item properties
    if (this.props) {
        for (var key in this.props) {
            var e = this.e.find("."+key);
            var v = this.props[key];
            if (v) {
                e.html(v);
                e.show();
            }
            else
                e.hide();
        }
    }

},//}}}

updateStatus: function (status_msg,class_name)//{{{
{
    if (!this.status.length)
        return;

    var e = this.status.find( "."+(class_name ? class_name : "msg") );
    if(e.length) {
        if( status_msg != null ) {
            e.html(status_msg);
            e.show();
        }
        else
            e.hide();
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
	this.props = properties;
	this.countermax.html(len);
    this.counternow.html(i);
    this.itempath = esc(href);

    // reset status
    this.status.children().hide();

    this.updateProgress();
    this.updateItemTitle();
    this.updateProperties();
},//}}}

popInfo: function ()//{{{
{
    if (this.info_t)
        clearTimeout(this.info_t);

    this.e.addClass("focused");

    var t = this;
    this.info_t = window.setTimeout(function(){t.e.removeClass("focused");},
            getConfig('pop_info_delay',4000));
},//}}}

hidden: function()//{{{
{
    return !this.e.hasClass("focused");
},//}}}

/** events */
/** \fn onSubmit(n)
 * \brief event is triggered after selecting item (pressing enter or mouse click)
 * \param n identification of submitted item
 */
onSubmit: function(n){},
}
//}}}

// HELPER FUNCTIONS//{{{
userAgents = {unknown:0, webkit:1, opera:2};

function esc (str) {//{{{
	// don't escape protocols (i.e. "http://" -> "http%3A//"
    if (str.search(/^\w+:\/\//) > -1)
		return encodeURI(str);
	else
		return escape(str);
}//}}}

function userAgent ()//{{{
{
if ( navigator.userAgent.indexOf("WebKit") != -1 )
    return userAgents.webkit;
if ( navigator.userAgent.indexOf("Opera") != -1 )
    return userAgents.opera;
else
    return userAgents.unknown;
}//}}}

function getConfig (name,default_value)//{{{
{
    var x;

    if ( (x = _config[name]) ||
         (x = vars[name])    ||
         (x = config[name]) )
    {
        // value should be same type as the default value
        switch( typeof(default_value) ) {
            case "string":
                return ""+x;
            break;
            case "number":
                return parseFloat(x);
            break;
            default:
                return x;
        }
    }

    return default_value;
}//}}}

function createPathElements(dir_e,filename_e,ext_e,path) {//{{{
    var m;

    m = path.lastIndexOf("/");
    if (m==-1)
        m  = path.lastIndexOf("\\");

    // directory
    var dir = path.substring(0,m);
    if (dir_e.length) {
        if (dir) {
            dir_e.html(dir);
            dir_e.show();
        }
        else
            dir_e.hide();
    }

    var filename = path.substring(m+1,path.length);

    m = filename.lastIndexOf(".");

    // filename
    if (filename_e.length)
        filename_e.html( filename.substring(0,m) );

    // extension
    if (ext_e.length)
        ext_e.html( filename.substring(m+1,filename.length) );
}//}}}

function getPage (i)//{{{
{
    return i ? Math.min( Math.max(i,1), len ) : 1
}//}}}

function go (i)//{{{
{
	var pg = getPage(i);

    n = vars['n'] = pg;

    // TODO: fix memory leaks!!!
    // reload window on every nth item
    var r = getConfig('reload_every');
    if (r) {
        if (m > 0 && r && m%r == 0) {
            m = 0;
            updateUrl();
            location.reload();
            return;
        }
        else
            m += 1;
    }

    // hide item list and select current item
    if ( itemlist ) {
        if ( !itemlist.hidden() )
            toggleList();
        itemlist.selectItem(i-1);
    }

	var item = this.ls[i-1];
	var itemname, props;
	if (item instanceof Array) {
		itemname = item[0];
		props = item[1];
	}
	else
		var itemname = item;

    updateInfo(itemname,n,len,props);

    updateTitle();
	updateUrl(1000);
	updateClassName();

    viewer.show(itemname);

    window.scrollTo(0,0);

    signal("go");
    if (n==1)
        signal("first");
    if (n==len)
        signal("last");
}//}}}

function updateInfo(itemname,n,len,props) {
    if(!info)
        return;

    info.updateInfo(itemname,n,len,props);
    signal("info_update");
}

function updateTitle ()//{{{
{
    // title format: GALLERY_NAME: n/N "image.png"
    document.title =
        (title ? title : "untitled") + ": " +
        n + "/" + len +
        ' "' + info.name() + '"';
}//}}}

function getUrlVars()//{{{
{
	var map = {};
	var parts = location.hash.replace(/[#&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		map[key] = value;
	});
	return map;
}//}}}

function updateClassName()//{{{
{
	b.className = "mode" + mode[mode.length-1] + " item" + n + (n == len ? " last" : "")
}//}}}

function updateUrl (timeout)//{{{
{
    hash = "";

    for (var key in vars)
        hash += (hash ? "&" : "") + key + "=" + vars[key];

    if ( hash != location.hash ) {
        // if url is updated immediately, user cannot browse images rapidly
		if (url_t)
			clearTimeout(url_t);
		if (timeout)
            url_t = window.setTimeout( 'if( hash == "'+hash+'" ) location.hash = "#'+hash+'";',timeout );
		else
			location.hash = "#"+hash;
    }
}//}}}

function preloadImages()//{{{
{
    if (preloaded == null) {
        // don't preload images when started
        preloaded = {};
        return;
    }

    var maxnum = getConfig('preload_images',2);
    var num = maxnum - (n+2) % maxnum;

    var new_preloaded = {};
    var end = Math.min(n+num,len);
    var begin = Math.max(n-maxnum+num+1,0);
    for(var i = begin; i < n; ++i)
        new_preloaded[i] = preloaded[i];
    for(var i = n; i < end; ++i) {
        // try to use already preloaded image
        var im = preloaded[i];
        if ( !im ) {
            // type of item must be image
			var item = this.ls[i];
            var filename = item instanceof Array ? item[0] : item;
            var view = ViewFactory.prototype.newView(filename);
            if (!view || view.type() != "image")
                continue;

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
        if ( itemlist.hidden() )
            mode.pop();
        else if ( mode[0] != modes.itemlist )
            mode.push(modes.itemlist);
		updateClassName();
    }
}//}}}

function scrollDown(how)//{{{
{
    return scroll(0,how ? how : window.innerHeight/4);
}//}}}

function scrollUp(how)//{{{
{
    return scroll(0,how ? how : -window.innerHeight/4);
}//}}}

function scrollLeft(how)//{{{
{
    return scroll(how ? how : -window.innerWidth/4,0);
}//}}}

function scrollRight(how)//{{{
{
    return scroll(how ? how : window.innerWidth/4,0);
}//}}}

function scroll (x,y)//{{{
{
    if (!viewer) return false;

    var d = x ? window.pageXOffset : window.pageYOffset;
    window.scrollBy(x,y);
    viewer.updatePreview();

    var newd = (x ? window.pageXOffset : window.pageYOffset);
    if (y) {
        if (newd == 0)
            signal("top");
        if (newd+window.innerHeight >= document.documentElement.scrollHeight)
            signal("bottom");
    }

    if (d != newd) {
        signal("scroll");
        return true
    }
    else
        return false;
}//}}}

function zoom(how)
{
    if (!viewer)
        return false;

    viewer.zoom(how);
    signal("zoom");
    return true;
}

function editText()//{{{
{
    if (!viewer)
        return false;

    var v = viewer.view;
    if (!v || v.type() != "font")
        return false;

    v.ee.focus();
    return true;
}//}}}

function videoTogglePlay ()//{{{
{
    if (!viewer)
        return false;

    var v = viewer.view;
    if (!v || v.type() != "video")
        return false;

    v.togglePlay();
    signal("video_play");
    return true;
}//}}}

function videoSpeed (d)//{{{
{
    if (!viewer)
        return false;

    var v = viewer.view;
    if (!v || v.type() != "video")
        return false;

    if (d>0)
        v.faster();
    if (d<0)
        v.slower();
    else
        v.normalSpeed();
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
    if (!viewer)
        return false;

    var v = viewer.view;
    if (!v || v.type() != "video")
        return false;

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

function popInfo ()//{{{
{
    if (!info)
        return false;

    info.popInfo();
    return true;
}//}}}

function popPreview ()//{{{
{
    if (!viewer)
        return false;

    viewer.popPreview();
    return true;
}//}}}

function signal (sgn)//{{{
{
    if (!events)
        return;

	if ( getConfig("show_events", false) ) {
		info.updateStatus("event: " + sgn);
        popInfo();
    }


    var fn = events[sgn];
    var t = typeof(fn);
    if (t == "string")
        eval(fn);
    else if (t == "function")
        fn();
}//}}}

//}}}

// INTERACTION//{{{
var keycodes = []//{{{
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
if ( userAgent() == userAgents.webkit ) {
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
    if ( n == len )
        return false;

    signal("next");
    go(n+1);
    return true;
}//}}}

function prev ()//{{{
{
    if ( n == 1 )
        return false;

    signal("prev");
    go(n-1);
    return true;
}//}}}

function keyPress (e)//{{{
{
	var keycode = e.keyCode ? e.keyCode : e.which;
	var keyname;

    keyname = keycodes[keycode];
    if ( !keyname )
		keyname = String.fromCharCode(keycode);

    keyname = keyname.toUpperCase()
    if ( e.altKey )
        keyname = "A-"+keyname
    if ( e.ctrlKey )
        keyname = "C-"+keyname
    if ( e.metaKey )
        keyname = "M-"+keyname
    if ( e.shiftKey )
        keyname = "S-"+keyname

	if ( getConfig("show_keys", false) ) {
		info.updateStatus("key: " + keyname + " ("+keycode+")");
        popInfo();
    }

    // try keys in this mode or modes.any
    var try_modes = [mode[mode.length-1],modes.any];
    for (var i in try_modes) {
        var k = keys[try_modes[i]];
        if (!k) continue;

        var fn = k[keyname];
        var t = typeof(fn);
        if (t == "string")
            eval(fn);
        else if (t == "function")
            fn();
        else
            continue;
        e.preventDefault();
        break;
    }
}//}}}

function onMouseWheel (e) {//{{{
    var delta = e.detail ? -e.detail*4 : e.wheelDelta/3;
    scroll(0,-delta);
    e.preventDefault();
}//}}}

function addKeys (newkeys, desc, fn, keymode)//{{{
{
    if (!keymode)
        keymode = modes.any;

    var ekeys = keys[keymode];
    if (!ekeys)
        ekeys = keys[keymode] = {};

    var k = newkeys instanceof Array ? newkeys : [newkeys];
    for (var i in k) {
		var modifiers = k[i].toUpperCase().split("-");
		var key = modifiers.pop();
		// sort modifiers
		modifiers = modifiers.map( function(x) {return x[0]} ).sort();
		key = modifiers.length ? modifiers.join("-")+"-"+key : key;
        ekeys[key] = fn;
	}

    // key description
    if (!desc) return;
    if (!keydesc)
        keydesc = {};
    var modekeydesc = keydesc[keymode];
    if (!modekeydesc)
        modekeydesc = keydesc[keymode] = {};
    modekeydesc[desc] = k;
}//}}}

function dragScroll(t,p) {
    var x,y,z;
    var b = $("body");

    if (p) {
        var win = p.find(".window");
        x = win.innerWidth()/2;
        y = win.innerHeight()/2;
        z = t.innerHeight()/p.innerHeight();
        continueDragScroll();
    }
    else {
        x = window.pageXOffset + mouseX;
        y = window.pageYOffset + mouseY;
    }

    b.mouseup(stopDragScroll);
    b.mousemove(continueDragScroll);

    //dragScroll(e);

    function stopDragScroll(e) {
        b.unbind('mousemove');
        b.unbind('mouseup');

        signal("drag_scroll_end");
        e.preventDefault();
    }

    function continueDragScroll(e) {
        if (p) {
            var pos = p.position();
            window.scrollTo(
                    z*(mouseX+window.pageXOffset-x-pos.left),
                    z*(mouseY+window.pageYOffset-y-pos.top) );
        }
        else
            window.scrollTo(x-mouseX,y-mouseY);

        signal("scroll");
        if (e)
            e.preventDefault();
    }
}
//}}}

function createItemList()//{{{
{
    var e = $("#itemlist");
    if (!e.length)
        return;

    itemlist = new ItemList(e,ls);

    itemlist.onSubmit = go;
}//}}}

function createViewer(e,preview,info)//{{{
{
    viewer = new Viewer(e,preview,vars['zoom']);
    viewer.onLoad = function() {
        preloadImages();
    }

    if (info) {
        viewer.onUpdateStatus = function(msg,class_name) { info.updateStatus( msg, class_name ); }
        viewer.onError = function(msg) { info.updateStatus( msg, "error" ); }
    }

    viewer.onZoomChanged = function(state) { if (vars['zoom'] == state) return; vars['zoom'] = state; updateUrl(1000); }
}//}}}

function createNavigation ()//{{{
{
    // keyboard
    if ( userAgent() == userAgents.webkit )
        document.onkeydown = keyPress;
    else
        document.onkeypress = keyPress;

    // mouse
    window.onmousewheel = document.onmousewheel = onMouseWheel;
    window.addEventListener('DOMMouseScroll', onmousewheel, false);

    // user controls
    if (controls) {
        for (var m in controls) {
            var km = controls[m];
            for (var i in controls[m]) {
                var k = km[i];
                addKeys(k[0],k[2],k[1],m);
            }
        }
    }
}//}}}

function createKeyHelp(e)//{{{
{
    for (var i in modes) {
        var cat = $('<div class="category"></div>');
        cat.appendTo(e);

        $('<h3>'+modes[i]+'</h3>').appendTo(cat);

        var modekeydesc = keydesc[modes[i]];
        for (var j in modekeydesc) {
            var key = $('<div class="key"></div>');
            key.appendTo(cat);

            $('<div class="which">'+modekeydesc[j].join(", ")+'</div>').appendTo(key);
            $('<div class="desc">'+j+'</div>').appendTo(key);
        }
    }
}//}}}

function createConfigHelp(e)//{{{
{
    // configuration//{{{
    var confdesc = {
        "Images": {
        'zoom_step': "zoom multiplier",
        'preload_images': "number of images to preload",
        },

        "Font": {
        'font_size': "font size",
        'font_test': "default text",
        },

        "Progress bar": {
        'progress_radius': "radius",
        'progress_width': "circle stroke width (background)",
        'progress_inner_width': "circle stroke width (foreground)",
        'progress_bg': "background color",
        'progress_fg': "foreground color",
        'progress_blur': "blur amount",
        'progress_shadow': "shadow size",
        },

        "Thumbnail": {
        'thumbnail_min_width': "minimum width",
        'thumbnail_max_width': "maximum width",
        'thumbnail_font_test': "default text for fonts",
        },

		"Audio/Video": {
		'autoplay': "Play audio/video when viewed",
		'loop': "Replay when playback ends",
		'autonext': "Go to next item whed playback ends",
		}
    };//}}}

    for (var i in confdesc) {
        var cat = $('<div class="category"></div>');
        cat.appendTo(e);

        var h3 = $("<h3>"+i+"</h3>");
        h3.appendTo(cat);

        var desc = confdesc[i];
        for (var j in desc) {
            var opt = $('<div class="option"></div>');
            opt.appendTo(cat);

            var which = $('<div class="which">'+j+'</div>');
            which.appendTo(opt);

            var desc = $('<div class="desc">'+confdesc[i][j]+'</div>');
            desc.appendTo(opt);
        }
    }
}//}}}

function createAbout(e)//{{{
{
    var content = [
        ["gallery created with","mkgallery v1.0"],
        ["author","Lukáš Holeček"],
        ["e-mail",'<a href="mailto:hluk@email.cz">hluk@email.cz</a>'],
    ];

    for (var i in content) {
        var x = content[i];
        var cat = $('<div class="category"></div>');
        cat.appendTo(e);

        var which = $('<div class="which">'+x[0]+'</div>');
        which.appendTo(cat);

        var desc = $('<div class="desc">'+x[1]+'</div>');
        desc.appendTo(cat);
    }
}//}}}

function createHelp(e)//{{{
{
    var ekeys = e.find(".keys");
    if (ekeys.length)
        createKeyHelp(ekeys);

    var econf = e.find(".options");
    if (econf.length)
        createConfigHelp(econf);

    var eother = e.find(".about");
    if (eother.length)
        createAbout(eother);
}//}}}

function toggleHelp()//{{{
{
    // key bindings
    if (!help) {
        help = $(".help");
        if (!help.length)
            return;
        createHelp(help);
    }

    if ( help.length ) {
        if ( help.hasClass("focused") ) {
            help.removeClass("focused");
            mode.pop();
        }
        else {
            help.addClass("focused");
            mode.push(modes.help);
        }
		updateClassName();
    }
}//}}}

function onResize()//{{{
{
    if (viewer)
        viewer.zoom();
    if (itemlist)
        itemlist.resize();
    signal("resized");
}//}}}

function onLoad()//{{{
{
    var e;

	if (len == 0) {
		alert("No items in gallery!");
		return;
	}

    b = document.getElementsByTagName("body")[0];

    // capture mouse position
    mouseX = mouseY = 0;
    $(document).mousemove(function(e){
            mouseX = e.clientX;
            mouseY = e.clientY;
            });

    // no scrollbars
    document.body.style.overflow = "hidden";

    // item list
    createItemList();

    // info
    e = $('#info');
    if (e)
        info = new Info(e);

    // viewer
    e = $('#canvas');
    if (e.length)
        createViewer(e,$('.preview'),info);

    // refresh zoom on resize
    window.onresize = onResize;

    // browser with sessions: update URL when browser window closed
    b.onbeforeunload = function() { updateUrl(); };

    // navigation
    createNavigation();

    go(n);
}//}}}

// reset user configuration
var config = {};
var _config = {};
var controls = {};
var events={};

// number of items in gallery
const len = ls ? ls.length : 0;

// url variables
var hash;
var vars = getUrlVars();

// page number
var n = getPage( getConfig('n',0) );
var m = 0;

// zoom
const zoom_step = getConfig('zoom_step',0.125);

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

var keys = {};
var keydesc;
var modes = {any:"Any", viewer:"Viewer", itemlist:"Item List", help:"Help"};
var mode = [modes.viewer];

