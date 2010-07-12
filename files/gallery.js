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
var Viewer = function(e,zoom) {
    this.init(e,zoom);
};

Viewer.prototype = {
init: function (e,zoom)//{{{
{
    this.e = e;
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

},//}}}

center: function()//{{{
{
    // center item in window
    var newtop = ( window.innerHeight - this.view.e.innerHeight() )/2;
    this.view.e.css("margin-top",(newtop > 0 ? newtop : 0) + "px");
},//}}}

append: function (view)//{{{
{
    view.appendTo(this.e);
},//}}}

remove: function (view)//{{{
{
    view.remove();
},//}}}

show: function (filepath)//{{{
{
    if (this.view)
        this.view.remove();

    this.view = this.viewFactory.newView( filepath );
    if ( this.view )
        this.view.show();
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
 * \brief triggers event thumbnailOnLoad(this) after thumbnail loaded
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
    this.path = path(imgpath);
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

    // don't use canvas in some cases:
    //  - GIF: redraw animated images in intervals
    //  - Opera
    if ( userAgent() == userAgents.opera || this.path.search(/\.gif$/i) > -1) {
        this.e = $("<div></div>");
        this.ctx = {
            drawImage: function (img,x,y,width,height) {
                           var e = $("#img");
                           if (!e.length)
                               view.e.appendChild(img);
                           img.width = width;
                           img.height = height;
                       }
        }
    }
    else {
        this.e = $("<canvas></canvas>");
        this.ctx = this.e[0].getContext('2d');
    }
    this.e.css("display","block");
    this.e.addClass("imageview");
    this._parent.append(this.e);

    this.img = $("<img></img>");
    this.img.attr("id","img");
    this.img.attr("src",escape(this.path));
    this.img.load( function () {
        view._parent.onUpdateStatus(null,"msg");

        view.orig_width = this.width ? this.width : this.naturalWidth;
        view.orig_height = this.height ? this.height : this.naturalHeight;

        view._parent.zoom();
        view._parent.onLoad();
    } );
},//}}}

remove: function()//{{{
{
    if ( !this.e )
        return;

    this._parent.remove(this.e);
    this.e = null;
},//}}}

thumbnail: function()//{{{
{
    if ( this.thumb )
        return this.thumb;

    var thumbpath = "thumbs/" + this.path.replace(/^.*[\/\\]/,'') + ".png";

    this.thumb = $('<img></img>');
    this.thumb.addClass("thumbnail");
    this.thumb.addClass(this.type());

    var view = this;
    var handler = function () { view.thumbnailOnLoad(view); };
    this.thumb.load(handler);
    this.thumb.error(handler);
    this.thumb.attr( "src", escape(thumbpath) );

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
    if(this.width)
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
 * \param view is caller object
 */
thumbnailOnLoad: function(view){},
}
//}}}

//! \class VideoView
//! \implements ItemView
//{{{
var VideoView = function(vidpath, _parent) { this.init(vidpath, _parent); };

VideoView.prototype = {
init: function(vidpath, _parent)//{{{
{
    this.path = path(vidpath);
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

	this.e = $("<video></video>");
	this.e.html("Your browser does not support the video tag.");
    this.e.attr("controls","controls");
    this.e.css("display","block");
    this.e.addClass("videoview");
    this._parent.append(this.e);

	if ( getConfig('autoplay',false) )
		this.e.attr("autoplay","autoplay");
	if ( getConfig('loop',false) )
		this.e.attr("loop","loop");
	// TODO: onended event doesn't work -- WHY?
	if ( getConfig('autonext',false) && next )
		this.e.bind("ended",next);

    this.e.attr("id","video");
    this.e.attr("src",escape(this.path));
    this.e.load( function () {
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
    this.e.error( function () {
        view._parent.onUpdateStatus( "Unsupported format!", "error" );
	} );
},//}}}

remove: function()//{{{
{
    if ( !this.e )
        return;

    this._parent.remove(this.e);
    this.e = null;
},//}}}

thumbnail: function()//{{{
{
    if ( this.thumb )
        return this.thumb;

    this.thumb = $('<div></div>');
    this.thumb.addClass("thumbnail");
    this.thumb.addClass(this.type());

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

    this.e = $('<textarea></textarea>');
    this.e.attr("src", escape(this.path));
    this.e.addClass("fontview");

    this.e.attr("value",config['font_test']);
    this.e.css("font-family",this.font);

    // disable keyboard navigation when textarea focused
    var view = this;
    this.e.focus( function () {
        view.keydown = document.onkeydown;
        view.keypress = document.onkeypress;
        document.onkeydown = function(e){
            if(e.keyCode == 27)
                view.e.blur();
        };
        document.onkeypress = null;
    } );
    this.e.blur( function () {
        config['font_test'] = this.value;
        document.onkeydown = view.keydown;
        document.onkeypress = view.keypress;
        view.updateHeight();
    } );

    this._parent.append(this.e);
    this._parent.zoom();

    this._parent.onLoad();
},//}}}

remove: function()//{{{
{
    if ( !this.e )
        return;

    this._parent.remove(this.e);
    this.e = null;
},//}}}

thumbnail: function()//{{{
{
    if ( this.thumb )
        return this.thumb;

    var font = this.path.replace(/.*\//gi, "").replace(".","-");

    this.thumb = $('<div></div>');
    this.thumb.addClass("thumbnail");
    this.thumb.addClass(this.type());
    this.thumb.css("max-width", getConfig('thumbnail_max_width',300) + "px");
    this.thumb.css("font-family", this.font);
    this.thumb.html(config['thumbnail_font_test']);

    this.thumbnailOnLoad(this);

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

    this._parent.onUpdateStatus( this.e.css("font-size"), "fontsize" );
},//}}}

updateHeight: function()//{{{
{
    // TODO: better solution
    this.e.hide();
    var view = this;
    this.e.css("height","50%");
    window.setTimeout(
        function(){
            view.e.show();
            view.e.css("height",view.e[0].scrollHeight+"px");
            view._parent.center(view.e.innerHeight());
        },10);
},//}}}

/** events */
/**
 * \fn thumbnailOnLoad()
 * \brief event is triggered after thumbnail is loaded
 * \param view is caller object
 */
thumbnailOnLoad: function(view){},
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
    this.template = e.find(".item");
    if (!this.template.length)
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

submitSelected: function()//{{{
{
    this.onSubmit(this.selected+1);
},//}}}

addThumbnails: function (items, i)//{{{
{
    if ( i == null )
        i = n-1;
    if ( i<0 || i>=len )
        return;
    if ( !items )
        items = this.items;

    var thumb_e = items[i].find(".thumbnail");
    if (thumb_e.length) {
        var item = this.ls[i];
		var filename = item instanceof Array ? item[0] : item;
        var thumb = this.viewFactory.newView(filename);
        thumb.dataNum = i;

        var t = this;
		thumb.thumbnailOnLoad = function(view) {t.thumbnailOnLoad(view)};

        var e = thumb.thumbnail();
        // show thumbnail only if src exists
		//e.css("display","none");
        e.appendTo(thumb_e);
    }
},//}}}

thumbnailOnLoad: function(thumb)//{{{
{
    var i = thumb.dataNum;
    // recursively load thumbnails from currently viewed
    // - flood load:
    //      previous and next thumbnails (from the current) are loaded in parallel
    if (i+1>=n)
        this.addThumbnails(this.items, i+1);
    if (i+1<=n)
        this.addThumbnails(this.items, i-1);
},//}}}

appendItem: function (i)//{{{
{
    var item = this.template.clone();
    item.data("number",i);
    var list = this;
    item.click( function() {
        list.onSubmit(item.data("number"));
    });

    // image identification
    var ident = item.find(".itemident");
    if (ident.length)
        ident.html(i);

	// get item filename, properties, width, height
    var x = this.ls[i-1];
    var itemname, props, w, h;
    if (x instanceof Array) {
        itemname = x[0];
        props = x[1];
		w = x[2];
		h = x[3];
    }
    else
        itemname = x;

	// set item max-width
	var e_w = item.find(".thumbnail_width");
	if ( e_w && w && !item.css("max-width") )
		item.css("max-width",w+20);

    // filename
    var dir_e = item.find(".directory");
    var filename_e = item.find(".filename");
    var ext_e = item.find(".extension");
    createPathElements(dir_e,filename_e,ext_e,itemname);

	// thumbnail size
    var thumb_e = item.find(".thumbnail");
	if (thumb_e) {
		if (w)
			thumb_e.css("width",w+"px");
		if (h)
			thumb_e.css("height",h+"px");
	}

    // item properties
    if (props) {
        for (var key in props) {
            var e = item.find("."+key);
            var v = props[key];
            if (v)
                e.html(v);
            else
                e.hide();
        }
    }

    item.appendTo(this.e);
    this.items.push(item);
},//}}}

toggle: function ()//{{{
{
    // are items loaded?
	if ( !this.items ) {
		this.items = [];

		for(var i=0; i<len; ++i) {
			var item = this.ls[i];
			this.appendItem(i+1);
		}

        // add thumbnails
        this.thumbs = [];
        this.addThumbnails();

        this.template.remove();

        // selection cursor
        this.selection = this.e.find(".selection");
        this.selection.css("position","absolute");

        // select current
        this.selectItem(n-1);
        this.selection_needs_update = true;
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
        this.selectItem(this.selected);
    }
},//}}}

selectItem: function (i)//{{{
{
    if (!this.items)
        return;
    var sel = this.items[this.selected];
    var e = this.items[i];

    if(sel)
        sel.attr("id","");
    e.attr("id","selected");
    this.selected = i;

    if ( this.hidden() )
        this.selection_needs_update = true;
    else {
        var pos = e.offset();
        // move selection cursor
        this.selection.css( "left", pos.left+"px" );
        this.selection.css( "top", pos.top+"px" );
        this.selection.css( "width", e.innerWidth()+"px" );
        this.selection.css( "height", e.innerHeight()+"px" );
    }
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
    for( i = this.selected+direction; i < this.items.length && i >= 0; i+=direction) {
        var e = this.items[i];
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
    this.ensureCurrentVisible();
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
    this.ensureCurrentVisible();
},//}}}

listLeft: function ()//{{{
{
    // select next
    var i = this.selected-1;
    if ( i < 0 )
        return;

    // deselect current and select new
    this.selectItem(i);
    this.ensureCurrentVisible();
},//}}}

listPageDown: function ()//{{{
{
    var min_pos = this.selection.offset().top+window.innerHeight;
    var i = this.selected;
    while ( ++i < len && min_pos > this.get(i).offset().top );
    this.selectItem(i-1);
    this.ensureCurrentVisible();
},//}}}

listPageUp: function ()//{{{
{
    var min_pos = this.selection.offset().top-window.innerHeight;
    var i = this.selected;
    while ( --i > 0 && min_pos < this.get(i).offset().top );
    this.selectItem(i+1);
    this.ensureCurrentVisible();
},//}}}
}
//}}}

//! \class Item
//{{{
var Item = function() {
    return new Item.prototype.init();
};

Item.prototype = {
init: function() {},
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

    this.progress = e[0].getElementsByClassName("progress")[0];
    this.counter = e.find(".counter");
    this.counternow = this.e.find(".counternow");
    this.countermax = this.e.find(".countermax");

    this.dir_e = e.find(".directory");
    this.filename_e = e.find(".filename");
    this.ext_e = e.find(".extension");
},//}}}

updateCounter: function ()//{{{
{
    if (this.counternow)
		this.counternow.html(this.n);
},//}}}

updateProgress: function ()//{{{
{
    if ( !this.progress )
        return;

    var ctx = this.progress.getContext("2d");
    var pi = 3.1415;
    var angle = 2*pi*this.n/this.len;
    var r = getConfig('progress_radius',22);
    var w = getConfig('progress_width',8);
    var x = r;
    var y = r;

    this.progress.setAttribute("width", r*2);
    this.progress.setAttribute("height", r*2);

    ctx.save();

    //ctx.clearRect(x-r,y-r,2*r,2*r);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, 0, 2*pi, false);
    ctx.fillStyle = getConfig('progress_bg',"rgba(200,200,200,0.4)");
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, -pi/2, angle-pi/2, false);
    ctx.fillStyle = getConfig('progress_fg',"rgba(255,200,0,0.8)");
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.globalCompositeOperation = "destination-out";
    ctx.arc(x, y, r-w, 0, 2*pi, false);
    ctx.fill();

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
        this.itemlink.attr( "href", path(this.itempath) );

    createPathElements(this.dir_e,this.filename_e,this.ext_e,this.href);
},//}}}

updateProperties: function ()//{{{
{
    // item properties
    if (this.props) {
        for (var key in this.props) {
            var e = this.e.find("."+key);
            var v = this.props[key];
            if (v)
                e.html(v);
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
        this.popInfo();
    }
},//}}}

name: function ()//{{{
{
    return this.aliasname ? this.aliasname+" ("+this.href+")" : this.href;
},//}}}

updateInfo: function (href,i,len,properties)//{{{
{
    this.href = href;
    this.n = i;
    this.len = len;
	this.props = properties;
	this.countermax.html(this.len);
    this.itempath = escape(this.href);

    // reset status
    this.status.children().hide();

    this.updateCounter();
    this.updateProgress();
    this.updateItemTitle();
    this.updateProperties();
},//}}}

popInfo: function ()//{{{
{
    if (this.info_t)
        clearTimeout(this.info_t);
    if ( !this.e.hasClass("focused") )
        this.e.addClass("focused");

    var t = this;
    this.info_t = window.setTimeout(function(){t.e.removeClass("focused");},4000);
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

function userAgent() //{{{
{
if ( navigator.userAgent.indexOf("WebKit") != -1 )
    return userAgents.webkit;
if ( navigator.userAgent.indexOf("Opera") != -1 )
    return userAgents.opera;
else
    return userAgents.unknown;
}//}}}

function getConfig (i,d)//{{{
{
    var x = vars[i];
    if (x==null)
        x = config[i];
    return (x==null) ? d : x;
}//}}}

function path (filename)//{{{
{
    return "items/" + filename;
}//}}}

function breakText(text) {//{{{
	// break filename ideally at characters / _ - .
	return text.replace(/[\.\/_-]/g,'$&\u200B');
}//}}}

function createPathElements(dir_e,filename_e,ext_e,path) {//{{{
	// TODO: "dir1/dir2/a\\b.png" etc.
	var m = path.match(/(.*)[\/\\](.*)/);

    var dir = m ? breakText(m[1]) : "";
    if (dir_e.length) {
        if (dir) {
            dir_e.html(dir);
            dir_e.show();
        }
        else
            dir_e.hide();
    }

    var filename = m ? m[2] : path;
	var m = filename.match(/(.*)\.([^.]*)/);

    // filename
    if (filename_e.length)
        filename_e.html( breakText(m ? m[1] : filename) );

    // extension
    if (ext_e.length)
        ext_e.html(m ? breakText(m[2]) : "");
}//}}}

function getPage (i)//{{{
{
    return i ? Math.min( Math.max(i,1), len ) : 1
}//}}}

function go (i)//{{{
{
	var pg = getPage(i);

    n = vars['n'] = pg;

    if ( itemlist && !itemlist.hidden() )
        toggleList();

	var item = this.ls[i-1];
	var itemname, alias;
	if (item instanceof Array) {
		var itemname = item[0];
		var alias = item[1];
	}
	else
		var itemname = item;

    if (info ) {
        info.updateInfo(itemname,n,len,alias);
        info.popInfo();
    }

    updateTitle();
	updateUrl(1000);
	updateClassName();

    viewer.show(itemname);

    window.scrollTo(0,0);
}//}}}

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

function getTop(e)//{{{
{
    var result = 0;

    do {
        result += e.offsetTop;
        e = e.offsetParent;
    } while(e);

    return result;
}//}}}

function getLeft(e)//{{{
{
    var result = 0;

    do {
        result += e.offsetLeft;
        e = e.offsetParent;
    } while(e);

    return result;
}//}}}

function preloadImages()//{{{
{
    if (preloaded == null) {
        // don't preload images when started
        preloaded = [];
        return;
    }

    var maxnum = getConfig('preload_images',2);
    var num = maxnum - (n+2) % maxnum;

    var new_preloaded = [];
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
            var filename = path(item instanceof Array ? item[0] : item);
            var view = ViewFactory.prototype.newView(filename);
            if (!view || view.type() != "image")
                continue;

            // create image
            im = new Image();
            im.src = escape(filename);

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
//}}}

// INTERACTION//{{{
var keycodes = []
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
    keycodes[109] = "-";
    keycodes[110] = ".";
    keycodes[111] = "/";
    keycodes[191] = "?";
}

function next()//{{{
{
    if ( n != len )
        go(n+1);
}//}}}

function prev()//{{{
{
    if ( n != 1 )
        go(n-1);
}//}}}

function keyPress (e)//{{{
{
    if ( e.ctrlKey || e.altKey || e.metaKey )
        return;

	var keycode = e.keyCode ? e.keyCode : e.which;
	var keyname;

    keyname = keycodes[keycode];
    if ( !keyname )
		keyname = String.fromCharCode(keycode);

    //DEBUG:
    //info.updateStatus(keycode+": "+keyname);

    // try keys in this mode or modes.any
    var try_modes = [mode[mode.length-1],modes.any];
    for (var i in try_modes) {
        var k = keys[try_modes[i]];
        if (!k) continue;

        var fn = k[keyname];
        if (!fn) continue;

        fn();
        e.preventDefault();
        break;
    }
}//}}}

function onMouseWheel (e) {//{{{
    var delta = e.detail ? -e.detail*4 : e.wheelDelta/3;
    window.scroll(window.pageXOffset,window.pageYOffset-delta);
    e.preventDefault();
    if ( window.pageYOffset == 0 )
        info.popInfo();
}//}}}

function initDragScroll ()//{{{
{
    var x,y;
    var dragging = false;

    document.addEventListener("mousedown",startDragScroll,false);
    document.addEventListener("mouseup",stopDragScroll,false);
    document.addEventListener("mousemove",dragScroll,false);

    function startDragScroll(e) {
        if (e.button == 0 && (e.target.id == "canvas" || e.target.className.match(/view$/))) {
            dragging = true;
            x = window.pageXOffset + e.clientX;
            y = window.pageYOffset + e.clientY;
            e.preventDefault();
        }
    }

    function stopDragScroll(e) {
        dragging = false;
    }

    function dragScroll(e) {
        if (dragging) {
            window.scroll(x-e.clientX,y-e.clientY);
            e.preventDefault();
            if ( window.pageYOffset == 0 )
                info.popInfo();
        }
    }
}//}}}
//}}}

function createItemList()//{{{
{
    var e = $("#itemlist");
    if (!e.length)
        return;

    itemlist = new ItemList(e,ls);

    itemlist.onSubmit = go;

    // navigation//{{{
    addKeys(["KP5","5"], "Toggle thumbnail list", toggleList);
    addKeys(["Escape"], "", toggleList, modes.itemlist);
    addKeys(["Enter"], "Go to selected item", function() {
            itemlist.submitSelected();
        }, modes.itemlist);
    addKeys(["Left","KP4","4"], "Move cursor left", function() {
            itemlist.listLeft();
        }, modes.itemlist);
    addKeys(["Right","KP6","6"], "Move cursor right", function() {
            itemlist.listRight();
        }, modes.itemlist);
    addKeys(["Up","KP8","8"], "Move cursor up", function() {
            itemlist.listUp();
        }, modes.itemlist);
    addKeys(["Down","KP2","2"], "Move cursor down", function() {
            itemlist.listDown();
        }, modes.itemlist);
    addKeys(["PageUp","KP9","9"], "Previous page", function() {
            itemlist.listPageUp();
        }, modes.itemlist);
    addKeys(["PageDown","KP3","3"], "Next page", function() {
            itemlist.listPageDown();
        }, modes.itemlist);
    addKeys(["End","KP1","1"], "Move cursor on last thumbnail", function() {
            itemlist.selectItem(itemlist.size()-1);
            itemlist.ensureCurrentVisible();
        }, modes.itemlist);
    addKeys(["Home","KP7","7"], "Move cursor on first thumbnail", function() {
            itemlist.selectItem(0);
            itemlist.ensureCurrentVisible();
        }, modes.itemlist);
    //}}}
}//}}}

function createViewer(e,info)//{{{
{
    viewer = new Viewer(e,vars['zoom']);

    viewer.onLoad = function() {
        preloadImages();
    }

    if (info) {
        viewer.onUpdateStatus = function(msg,class_name) { info.updateStatus( msg, class_name ); }
        viewer.onError = function(msg) { info.updateStatus( msg, "error" ); }
    }

    viewer.onZoomChanged = function(state) { if (vars['zoom'] == state) return; vars['zoom'] = state; updateUrl(1000); }

    // navigation//{{{
    addKeys(["PageUp"], "", function() {
            window.scrollBy(0,-window.innerHeight);
            if ( window.pageYOffset == 0 )
                info.popInfo();
        }, modes.viewer);
    addKeys(["PageDown"], "", function() {
            window.scrollBy(0,window.innerHeight);
        }, modes.viewer);
    addKeys(["End"], "", function() {
            window.scrollTo(0,b.scrollHeight);
        }, modes.viewer);
    addKeys(["Home"], "", function() {
            window.scrollTo(0,0);
            info.popInfo();
        }, modes.viewer);
    addKeys(["Space"], "Move window down/Next gallery item/Play or pause", function() {
			var v = viewer.view;
			if (v && v.type() == "video")
				v.togglePlay();
			else if ( window.pageYOffset+window.innerHeight >= document.documentElement.scrollHeight )
                next();
            else
                window.scrollBy(0,window.innerHeight*9/10);
        }, modes.viewer);
    addKeys(["E","e"], "Edit font text", function() {
			var v = viewer.view;
			if (v && v.type() == "font")
				v.ee.focus();
        }, modes.viewer);
    addKeys(["KP1","1"], "Browse to last gallery item", function() {
            if ( n != len )
                go(len);
        }, modes.viewer);
    addKeys(["KP2","2"], "", function() {
            window.scrollBy(0,window.innerHeight/4);
        }, modes.viewer);
    addKeys(["KP3","3"], "Browse to fifth next gallery item", function() {
            if ( n != len )
                go(n+5);
        }, modes.viewer);
    addKeys(["KP4","4","K","k"], "Previous", prev, modes.viewer);
    addKeys(["KP6","6","Enter","J","k"], "Next", next, modes.viewer);
    addKeys(["KP7","7"], "Browse to first gallery item", function() {
            if ( n != 1 )
                go(1);
        }, modes.viewer);
    addKeys(["KP8","8"], "", function() {
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                info.popInfo();
        }, modes.viewer);
    addKeys(["KP9","9"], "Browse to fifth previous gallery item", function() {
            if ( n != 1 )
                go(n-5);
        }, modes.viewer);
    addKeys(["KP0","0"], "Normal speed playback", function() {
			var v = viewer.view;
			if (v && v.type() == "video")
				v.normalSpeed();
        }, modes.viewer);
    addKeys(["+"], "Zoom in", function() {
            viewer.zoom("+");
        }, modes.viewer);
    addKeys(["-"], "Zoom out", function() {
            viewer.zoom("-");
        }, modes.viewer);
    addKeys(["*"], "Zoom to original size", function() {
            viewer.zoom(1);
        }, modes.viewer);
    addKeys(["/"], "Zoom to fit", function() {
            viewer.zoom("fit");
        }, modes.viewer);
    addKeys(["."], "Zoom to fill", function() {
            viewer.zoom("fill");
        }, modes.viewer);
    //}}}
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

    initDragScroll();

    addKeys(["?","H","h"], "Show this help", toggleHelp);
    addKeys(["Escape","?","H","h"], "Hide help", function() {
            toggleHelp(true);
            }, modes.help);
    addKeys(["Left"], "Move window left/Slower playback/Previous gallery item", function () {
			var v = viewer.view;
			if (v && v.type() == "video")
				v.slower();
            else if ( !viewer.width() || viewer.width() <= window.innerWidth )
                prev();
            else
                window.scrollBy(-window.innerWidth/4,0);
        });
    addKeys(["Right"], "Move window right/Faster playback/Next gallery item", function() {
			var v = viewer.view;
			if (v && v.type() == "video")
				v.faster();
            else if ( !viewer.width() || viewer.width() <= window.innerWidth )
                next();
            else
                window.scrollBy(window.innerWidth/4,0);
        });
    addKeys(["Up"], "Move window up", function() {
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                info.popInfo();
        });
    addKeys(["Down"], "Move window down", function() {
            window.scrollBy(0,window.innerHeight/4);
        });
}//}}}

function addKeys(newkeys, desc, fn, keymode)//{{{
{
    if (!keys)
        keys = {};
    if (!keymode)
        keymode = modes.any;

    var ekeys = keys[keymode];
    if (!ekeys)
        ekeys = keys[keymode] = {};

    for (var i in newkeys) {
        ekeys[newkeys[i]] = fn;
    }

    // key description
    if (!desc) return;
    if (!keydesc)
        keydesc = {};
    var modekeydesc = keydesc[keymode];
    if (!modekeydesc)
        modekeydesc = keydesc[keymode] = {};
    modekeydesc[desc] = newkeys;
}//}}}

function createKeyHelp(e)//{{{
{
    for (var i in modes) {
        var cat = document.createElement("div");
        cat.className = "category";
        e.appendChild(cat);

        var h3 = document.createElement("h3");
        h3.innerHTML = modes[i];
        cat.appendChild(h3);

        var modekeydesc = keydesc[modes[i]];
        for (var j in modekeydesc) {
            var key = document.createElement("div");
            key.className = "key";
            cat.appendChild(key);

            var which = document.createElement("div");
            which.className = "which";
            which.innerHTML = modekeydesc[j].join(", ");
            key.appendChild(which);

            var desc = document.createElement("desc");
            desc.className = "desc";
            desc.innerHTML = j;
            key.appendChild(desc);
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
        'progress_width': "width",
        'progress_bg': "background color",
        'progress_fg': "foreground color",
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
        var cat = document.createElement("div");
        cat.className = "category";
        e.appendChild(cat);

        var h3 = document.createElement("h3");
        h3.innerHTML = i;
        cat.appendChild(h3);

        var desc = confdesc[i];
        for (var j in desc) {
            var opt = document.createElement("div");
            opt.className = "option";
            cat.appendChild(opt);

            var which = document.createElement("div");
            which.className = "which";
            which.innerHTML = j;
            opt.appendChild(which);

            var desc = document.createElement("desc");
            desc.className = "desc";
            desc.innerHTML = confdesc[i][j];
            opt.appendChild(desc);
        }
    }
}//}}}

function createAbout(e)//{{{
{
	var cat = document.createElement("div");
	cat.className = "category";
	e.appendChild(cat);

	var which = document.createElement("div");
	which.className = "which";
	which.innerHTML = "gallery created with";
	cat.appendChild(which);

	var desc = document.createElement("desc");
	desc.className = "desc";
	desc.innerHTML = "mkgallery v1.0";
	cat.appendChild(desc);

	var cat = document.createElement("div");
	cat.className = "category";
	e.appendChild(cat);

	var which = document.createElement("div");
	which.className = "which";
	which.innerHTML = "author";
	cat.appendChild(which);

	var desc = document.createElement("desc");
	desc.className = "desc";
	desc.innerHTML = "Lukáš Holeček";
	cat.appendChild(desc);

	var cat = document.createElement("div");
	cat.className = "category";
	e.appendChild(cat);

	var which = document.createElement("div");
	which.className = "which";
	which.innerHTML = "e-mail";
	cat.appendChild(which);

	var desc = document.createElement("desc");
	desc.className = "desc";
	desc.innerHTML = "<a href=\"mailto:hluk@email.cz\">hluk@email.cz</a>";
	cat.appendChild(desc);
}//}}}

function createHelp(e)//{{{
{
    var ekeys = document.getElementById("keys");
    if (ekeys)
        createKeyHelp(ekeys);

    var econf = document.getElementById("options");
    if (econf)
        createConfigHelp(econf);

    var eother = document.getElementById("about");
    if (eother)
        createAbout(eother);

    // disable showing item list in help mode
    addKeys(["KP5","5"], "", function() {}, modes.help);
}//}}}

function toggleHelp(hide)//{{{
{
    // key bindings
    if (!help) {
        help = document.getElementById("help");
        if (!help)
            return;
        createHelp(help);
    }

    if ( help && !(hide && !help.className) ) {
        if (hide) {
            help.className = "";
            mode.pop();
        }
        else {
            help.className = "focused";
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
}//}}}

function onLoad()//{{{
{
    var e;

	if (len == 0) {
		alert("No items in gallery!");
		return;
	}

    b = document.getElementsByTagName("body")[0];

    // no scrollbars
    document.body.style.overflow = "hidden";

    // item list
    createItemList();

    // info
    e = $("#info");
    if (e)
        info = new Info(e);

    // viewer
    e = document.getElementById("canvas");
    if (e)
        createViewer(e,info);

    // refresh zoom on resize
    window.onresize = onResize;

    // browser with sessions: update URL when browser window closed
    b.onbeforeunload = function() { updateUrl(); };

    // navigation
    createNavigation();

    go(n);
}//}}}

// number of items in gallery
var len = ls ? ls.length : 0;

// url variables
var hash;
var vars = getUrlVars();

// page number
var n = getPage( parseInt(vars['n']) );

// zoom
var zoom_step = getConfig('zoom_step',0.125);

// body
var b;

// objects (created if appropriate HTML element is available)
var itemlist, info, viewer, help;

// image cache
var preloaded = null;

// URL hash timeout
var url_t;

var keys;
var keydesc;
var modes = {any:"Any", viewer:"Viewer", itemlist:"Item List", help:"Help"};
var mode = [modes.viewer];

