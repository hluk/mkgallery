/*
 * HTML document should include lines:
    <script type="text/javascript" src="THIS_FILE.js"></script>
    <body onload="onLoad()">
 * and optionally:
    <div id="canvas></canvas>
    <div id="info">
        <span id="counter"></span>
        <span id="itemtitle"></span>
        <span id="resolution"></span>
    </div>
    <div id="itemlist"></div>
 *
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
/**
 * events
 *
 * \fn onUpdateStatus(msg,class_name)
 * \brief event is triggered after changing status of view/viewer
 * \param msg status text
 * \param class_name class of status text ("loading", "error" or custom)
 *
 * \fn onLoad()
 * \brief event is triggered after item is successfully loaded
 *
 * \fn onError(error_msg);
 * \brief event is triggered after error
 *
 * \fn onZoomChanged(zoom_state)
 * \brief event is triggered after zoom is changed
 * \param zoom_state "fit", "fill" or zoom factor (float)
 */
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

    // center item in window
    var newtop = ( window.innerHeight - this.view.height )/2;
    this.e.style.top = (newtop > 0 ? newtop : 0) + "px";

    if ( this.zoom_state != z ) {
        this.zoom_state = z;
        if (this.onZoomChanged)
            this.onZoomChanged(z);
    }

},//}}}

append: function (view)//{{{
{
    this.e.appendChild(view);
},//}}}

remove: function (view)//{{{
{
    this.e.removeChild(view);
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
    else if (filepath.search(/(ttf|otf)\)?$/i) > -1)
        return new FontView(filepath, this._parent);
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
 * \brief calls _parent.thumbnailOnLoad(this) after item loaded
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
    if ( this.e )
        return;

    if ( this._parent.onUpdateStatus )
        this._parent.onUpdateStatus("loading","loading");

    // TODO: SVG -- for some reason this doesn't work in Chromium
    //if (this.path.search(/\.svg$/i) > -1) {
        //this.e = document.createElement("embed");
    //}
    //else {
        //this.e = document.createElement("img");
    //}
    this.e = document.createElement("canvas");
    this.e.className = "imageview";
    this.e.name = "view";
    this.ctx = this.e.getContext('2d');
    this._parent.append(this.e);

    this.img = document.createElement("img");
    this.img.src = this.path;
    var view = this;
    this.img.onload = function () {
        view.e.width = view.orig_width = this.naturalWidth;
        view.e.height = view.orig_height = this.naturalHeight;

        view._parent.zoom();
        if ( view._parent.onUpdateStatus )
            view._parent.onUpdateStatus(view.orig_width+"x"+view.orig_height);
        if ( view._parent.onLoad )
            view._parent.onLoad();
    };
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

    this.thumb = document.createElement("img");
    this.thumb.src = thumbpath;
    this.thumb.className = "thumbnail " + this.type();
    this.thumb.src = thumbpath;

    var view = this;
    this.thumb.onerror = this.thumb.onload = function () { view._parent.thumbnailOnLoad(view); };

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

    this.e.width = this.width = this.e.width = w*z;
    this.e.height = this.height = this.e.height = h*z;
    this.ctx.drawImage(this.img,0,0,this.width,this.height);
    this.zoom_factor = z;

    this._parent.zoomChanged(how,this.zoom_factor);
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
},//}}}

type: function ()//{{{
{
    return "font";
},//}}}

show: function()//{{{
{
    if (this.e)
        return;

    this.e = document.createElement("div");
    this.e.src = this.path;
    this.e.className = "fontview";
    this.e.name = "view";

    this.ee = document.createElement("textarea");

    this._parent.e.style.width = "100%";
    this._parent.e.style.height = "100%";
    this.e.style.width = "80%";
    this.e.style.height = "80%";
    this.ee.style.width = "100%";
    this.ee.style.height = "100%";
    this.ee.style.border = "0px";

    this.ee.style.overflow = "hidden";
    this.ee.style.background = "rgba(0,0,0,0)";
    this.ee.value = config['font_test'];
    this.ee.style.fontFamily = this.font;

    // disable keyboard navigation when textarea focused
    var view = this;
    this.ee.onfocus = function () {
        view.keydown = document.onkeydown;
        view.keypress = document.onkeypress;
        document.onkeydown = null;
        document.onkeypress = null;
    };
    this.ee.onblur = function () {
        config['font_test'] = this.value;
        document.onkeydown = view.keydown;
        document.onkeypress = view.keypress;
    };

    this.e.appendChild(this.ee);

    this._parent.append(this.e);
    this._parent.zoom();

    if ( this._parent.onLoad )
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
    this.thumb = document.createElement("div");
    this.thumb.className = "thumbnail " + this.type();
    this.thumb.style.maxWidth = config.get('thumbnail_max_width',300) + "px";
    this.thumb.style.fontFamily = this.font;
    this.thumb.innerHTML = config['thumbnail_font_test'];

    this._parent.thumbnailOnLoad(this);

    return this.thumb;
},//}}}

zoom: function (how)//{{{
{
    var orig = config.get('font_size',16);

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

    this.ee.style.fontSize = zz+"pt";
    this.height = this.e.offsetHeight;
    this.ee.style.height = this.ee.scrollHeight;

    this.zoom_factor = z;

    this._parent.zoomChanged(how,this.zoom_factor);

    if ( this._parent.onUpdateStatus )
        this._parent.onUpdateStatus(this.ee.style.fontSize);
},//}}}
}
//}}}

//! \class ItemList
//{{{
var ItemList = function(e,items) { this.init(e,items); };

ItemList.prototype = {
init: function (e,items)//{{{
{
    this.e = e;
    if (!this.e)
        return null;
    this.ls = items;

    this.e.style.display = "none";
    this.lastpos = [0,0];

    this.viewFactory = new ViewFactory(this);
},//}}}

get: function(i)//{{{
{
    return this.items[i];
},//}}}

hidden: function()//{{{
{
    return this.e.style.display == "none";
},//}}}

size: function ()//{{{
{
    return this.items.length;
},//}}}

submitSelected: function()//{{{
{
    go(this.selected+1);
},//}}}

addThumbnails: function (items, i)//{{{
{
    if ( i == null )
        i = n-1;
    if ( i<0 || i>=len )
        return;
    if ( !items )
        items = this.items;

    var thumb = this.viewFactory.newView( this.ls[i] );
    thumb.dataNum = i;
    var e = thumb.thumbnail();
    // show thumbnail only if src exists
    e.style.display = "none";
    items[i].appendChild(e);
},//}}}

thumbnailOnLoad: function(thumb)//{{{
{
    this.thumbs.push( thumb.thumbnail() );

    var i = thumb.dataNum;
    // recursively load thumbnails from currently viewed
    // - flood load:
    //      previous and next thumbnails (from current) are loaded in paralel
    if (i+1>=n)
        this.addThumbnails(this.items, i+1);
    if (i+1<=n)
        this.addThumbnails(this.items, i-1);
},//}}}

appendItem: function (itemname, i)//{{{
{
    var item = document.createElement('div');
    item.dataNum = i;
    item.className = "item";
    item.onclick = function() {
        go(this.dataNum);
    }

    // image identification
    var ident = document.createElement('div');
    ident.className = "itemident";
    ident.innerHTML = i;

    // item text
    var txt = document.createElement('div');
    txt.className = "itemname";
    // break text ideally at characters / _ - .
    txt.appendChild( document.createTextNode(itemname.replace(/[\.\/_-]/g,'$&\u200B')) );
    txt.style.maxWidth = config.get('thumbnail_max_width',300) + "px";

    item.appendChild(ident);
    item.appendChild(txt);

    this.e.appendChild(item);
    this.items.push(item);
},//}}}

reloadThumbnails: function ()//{{{
{
    var thumb;
    var minwidth = config.get('thumbnail_min_width',100);
    var maxwidth = config.get('thumbnail_max_width',300);
    while ( thumb = this.thumbs.pop() ) {
        //thumb.style.maxWidth = maxwidth;
        if ( thumb.width != 0 )
            thumb.style.display = "";
        thumb.style.maxWidth = Math.max( minwidth, Math.min(thumb.width,maxwidth) ) + "px";
    }
    this.updateSelection();
    this.ensureCurrentVisible();
},//}}}

toggle: function ()//{{{
{
    // are items loaded?
    if ( !this.items ) {
        this.items = [];

        for(var i=0; i<len; ++i)
            this.appendItem(this.ls[i], i+1);

        // add thumbnails
        this.thumbs = [];
        this.addThumbnails();

        // moving selection cursor is faster than changing style of current item
        this.selection = document.createElement("div");
        this.selection.id = "selection";
        this.e.appendChild(this.selection);

        // select current
        this.selectItem(n-1);
        this.selection_needs_update = true;
    }

    var lastpos2 = [window.pageXOffset,window.pageYOffset];
    this.e.style.display = this.hidden() ? "" : "none";
    window.scrollTo( this.lastpos[0], this.lastpos[1] );
    this.lastpos = lastpos2;

    if ( !this.hidden() ) {
        if ( this.thumbs.length )
            this.reloadThumbnails();
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
    var y = getTop(e);
    var d = y + e.offsetHeight - window.pageYOffset - window.innerHeight;
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
        sel.id = "";
    e.id = "selected";
    this.selected = i;

    if ( this.hidden() )
        this.selection_needs_update = true;
    else {
        // move selection cursor
        this.selection.style.left = getLeft(e)+"px";
        this.selection.style.top = getTop(e)+"px";
        this.selection.style.width = e.offsetWidth+"px";
        this.selection.style.height = e.offsetHeight+"px";
    }
},//}}}

listVertically: function (direction)//{{{
{
    var sel = this.items[this.selected];
    var x = getLeft(sel) - window.pageXOffset + sel.offsetWidth/2;
    var y = Math.floor(getTop(sel) + sel.offsetHeight/2);
    var ny
    var dist = 99999; // smallest X distance
    var newdist;

    // select item on next/previous line,
    // item has smallest X distance from curently selected
    var i;
    for( i = this.selected+direction; i < this.items.length && i >= 0; i+=direction) {
        var e = this.items[i];

        if ( newdist == null ) {
            ny = getTop(e) + e.offsetHeight/2;
            if ( (direction > 0 && ny-y < 10) || (direction < 0 && y-ny < 10) )
                continue;
        }
        else if( ny - getTop(e) - e.offsetHeight/2 > 10 )
            break;

        var newdist = Math.abs( getLeft(e) + e.offsetWidth/2 - x );
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
    var min_pos = this.selection.offsetTop+window.innerHeight;
    var i = this.selected;
    while ( ++i < len && min_pos > this.get(i).offsetTop );
    this.selectItem(i-1);
    this.ensureCurrentVisible();
},//}}}

listPageUp: function ()//{{{
{
    var min_pos = this.selection.offsetTop-window.innerHeight;
    var i = this.selected;
    while ( --i > 0 && min_pos < this.get(i).offsetTop );
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
var Info = function(e,counter,itemtitle,resolution,progress) {
    this.init(e,counter,itemtitle,resolution,progress);
};

Info.prototype = {
init: function(e,counter,itemtitle,resolution,progress)//{{{
{
    this.e = e;
	this.counter = counter;
	this.itemtitle = itemtitle;
    this.resolution = resolution;
    this.progress = progress;
},//}}}

updateCounter: function ()//{{{
{
    if ( !this.counter )
        return;
    this.counter.textContent = this.counter.innerHTML = this.n + "/" + this.len;
    if (this.n == this.len)
        this.counter.className = "last";
    else
        this.counter.className = "";
},//}}}

updateProgress: function ()//{{{
{
    if ( !this.progress )
        return;

    var ctx = this.progress.getContext("2d");
    var pi = 3.1415;
    var angle = 2*pi*this.n/this.len;
    var r = config.get('progress_radius',22);
    var w = config.get('progress_width',8);
    var x = r;
    var y = r;

    this.progress.setAttribute("width", r*2);
    this.progress.setAttribute("height", r*2);

    ctx.save();

    ctx.clearRect(x-r,y-r,2*r,2*r);

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, 0, 2*pi, false);
    ctx.fillStyle = config.get('progress_bg',"rgba(200,200,200,0.4)");
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, -pi/2, angle-pi/2, false);
    ctx.fillStyle = config.get('progress_fg',"rgba(255,200,0,0.8)");
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.globalCompositeOperation = "destination-out";
    ctx.arc(x, y, r-w, 0, 2*pi, false);
    ctx.fill();

    ctx.restore();

    // move counter to center of the cicle
    if (!this.counter)
        return;

    this.counter.style.position = "absolute";
    this.counter.style.left = (x-this.counter.offsetWidth/2)+"px";
    this.counter.style.top = (y-this.counter.offsetHeight/2)+"px";
},//}}}

updateItemTitle: function ()//{{{
{
	var l = document.getElementById("link");
    if (l)
        this.itemtitle.removeChild(l);

    l = document.createElement('a');
    l.id = "link";
	l.href = path( this.name() );
	l.appendChild(document.createTextNode( this.name() ));
	this.itemtitle.appendChild(l);
},//}}}

updateStatus: function (status_msg,class_name)//{{{
{
    if (!this.resolution)
        return;

    this.resolution.textContent = this.resolution.innerHTML = status_msg;
    this.resolution.className = class_name;
    this.popInfo();
},//}}}

name: function ()//{{{
{
    return this.itemname;
},//}}}

updateInfo: function (itemname,i,len)//{{{
{
    // image filename and path
    this.itemname = itemname;
    this.n = i;
    this.len = len;
    this.itempath = encodeURIComponent( this.name() );

    this.updateCounter();
    this.updateProgress();
    this.updateItemTitle();
},//}}}

popInfo: function ()//{{{
{
    if (this.info_t)
        clearTimeout(this.info_t);
    this.e.className = "focused";

    var t = this;
    this.info_t = setTimeout(function(){t.e.className = "";},4000);
},//}}}

hidden: function()//{{{
{
    return this.e.className != "focused";
},//}}}
}
//}}}


// HELPER FUNCTIONS//{{{
config.get = function (i,d)//{{{
{
    var x = this[i];
    return (x==null) ? d : x;
}//}}}

function path (filename)//{{{
{
    return "imgs/" + filename;
}//}}}

function getPage (i)//{{{
{
	if (!i || i<1)
		return 1;
	else if (i > len)
		return len;
	else
		return i;
}//}}}

function go (i)//{{{
{
	var pg = getPage(i);

    if (itemlist) {
        if( !itemlist.hidden() )
            toggleList();
        itemlist.selectItem(pg-1);
    }

    n = vars['n'] = pg;

    var itemname = ls[n-1];
    viewer.show( itemname );

    if (info ) {
        info.updateInfo(itemname,n,len);
        info.popInfo();
    }

    updateTitle();

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

function updateUrl (immediately)//{{{
{
    hash = "";

    for (var key in vars)
        hash += (hash ? "&" : "") + key + "=" + vars[key];

    if ( hash != location.hash ) {
        // if url is updated immediately, user cannot browse images rapidly
        if (immediately)
            location.hash = "#"+hash;
        else
            window.setTimeout( 'if( hash == "'+hash+'" ) location.hash = "#'+hash+'";',1000 );
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

    var maxnum = config.get('preload_images',2);
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
            var filename = path(ls[i]);
            var view = ViewFactory.prototype.newView(filename);
            if (!view || view.type() != "image")
                continue;

            // create image
            im = new Image();
            im.src = filename;

            // since we access the disk (read the image) we can also
            // change the url - browser saves history
            updateUrl();
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
if ( navigator.userAgent.indexOf("WebKit") != -1 ) {
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

    // DEBUG:
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
        if (e.button == 0 && (e.target.id == "canvas" || e.target.className == "imageview")) {
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

function createItemList(e)//{{{
{
    itemlist = new ItemList(e,ls);
    // item list is initially hidden
    if ( !itemlist && document.getElementById("itemlist") )
        document.getElementById("itemlist").style.display = "none";

    // navigation//{{{
    addKeys(["KP5","5"], "Toggle thumbnail list", toggleList);
    addKeys(["Escape"], "", toggleList, modes.itemlist);
    addKeys(["Enter"], "Go to selected item", function() {
            itemlist.submitSelected();
        }, modes.itemlist);
    addKeys(["Left","KP4"], "Move cursor left", function() {
            itemlist.listLeft();
        }, modes.itemlist);
    addKeys(["Right","KP6"], "Move cursor right", function() {
            itemlist.listRight();
        }, modes.itemlist);
    addKeys(["Up","KP8"], "Move cursor up", function() {
            itemlist.listUp();
        }, modes.itemlist);
    addKeys(["Down","KP2"], "Move cursor down", function() {
            itemlist.listDown();
        }, modes.itemlist);
    addKeys(["PageUp","KP9"], "Previous page", function() {
            itemlist.listPageUp();
        }, modes.itemlist);
    addKeys(["PageDown","KP3"], "Next page", function() {
            itemlist.listPageDown();
        }, modes.itemlist);
    addKeys(["End","KP1"], "Move cursor on last thumbnail", function() {
            itemlist.selectItem(itemlist.size()-1);
            itemlist.ensureCurrentVisible();
        }, modes.itemlist);
    addKeys(["Home","KP7"], "Move cursor on first thumbnail", function() {
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

    viewer.onZoomChanged = function(state) { if (vars['zoom'] == state) return; vars['zoom'] = state; updateUrl(); }

    // navigation//{{{
    addKeys(["Left"], "Move window left/Previous gallery item", function () {
            if ( viewer.width() <= window.innerWidth )
                prev();
            else
                window.scrollBy(-window.innerWidth/4,0);
        }, modes.viewer);
    addKeys(["Right"], "Move window right/Next gallery item", function() {
            if ( viewer.width() <= window.innerWidth )
                next();
            else
                window.scrollBy(window.innerWidth/4,0);
        }, modes.viewer);
    addKeys(["Up"], "Move window up", function() {
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                info.popInfo();
        }, modes.viewer);
    addKeys(["Down"], "Move window down", function() {
            window.scrollBy(0,window.innerHeight/4);
        }, modes.viewer);
    addKeys(["PageUp"], "", function() {
            window.scrollBy(0,-window.innerHeight);
            if ( window.pageYOffset == 0 )
                info.popInfo();
        }, modes.viewer);
    addKeys(["PageDown"], "", function() {
            window.scrollBy(0,window.innerHeight);
        }, modes.viewer);
    addKeys(["End"], "", function() {
            window.scrollTo(0,document.body.scrollHeight);
        }, modes.viewer);
    addKeys(["Home"], "", function() {
            window.scrollTo(0,0);
            info.popInfo();
        }, modes.viewer);
    addKeys(["Space"], "Move window down/Next gallery item", function() {
            if ( window.scrollY == window.scrollMaxY )
                next();
            else
                window.scrollBy(0,window.innerHeight*9/10);
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
    addKeys(["KP4","4","K"], "Next", prev, modes.viewer);
    addKeys(["KP6","6","Enter","J"], "Previous", next, modes.viewer);
    addKeys(["KP7","7"], "Browse to first gallery item", function() {
            if ( n != 1 )
                go(modes.viewer);
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

function createNavigation (enext, eprev, elist)//{{{
{
    if (enext)
        enext.onclick = next;
    if (eprev)
        eprev.onclick = prev;
    if (elist && itemlist)
        elist.onclick = toggleList;

    // keyboard
    if ( navigator.userAgent.indexOf("WebKit") != -1 )
        document.onkeydown = keyPress;
    else
        document.onkeypress = keyPress;

    // mouse
    window.onmousewheel = document.onmousewheel = onMouseWheel;
    window.addEventListener('DOMMouseScroll', onmousewheel, false);

    initDragScroll();

    addKeys(["?","H"], "Show this help", toggleHelp);
    addKeys(["Escape","?","H"], "Hide help", function() {
            toggleHelp(true);
            }, modes.help);
    // disable showing item list in help mode
    addKeys(["KP5","5"], "", function() {}, modes.help);
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

function createHelp(e)//{{{
{
    var h1 = document.createElement("h1");
    h1.innerHTML = "Help";
    e.appendChild(h1);

    for (var i in modes) {
        var keymode = document.createElement("div");
        keymode.className = "mode";
        e.appendChild(keymode);

        var h2 = document.createElement("h2");
        h2.innerHTML = modes[i];
        keymode.appendChild(h2);

        var modekeydesc = keydesc[modes[i]];
        for (var j in modekeydesc) {
            var key = document.createElement("div");
            key.className = "key";
            keymode.appendChild(key);

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

function toggleHelp(hide)//{{{
{
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
    }
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
    e = document.getElementById("itemlist")
    if (e)
        createItemList(e);

    // info
    var e = document.getElementById("info");
    if (e) {
        info = new Info(e,
                document.getElementById("counter"),
                document.getElementById("itemtitle"),
                document.getElementById("resolution"),
                document.getElementById("progress"));
    }

    // viewer
    e = document.getElementById("canvas");
    if (e)
        createViewer(e,info);

    // refresh zoom on resize
    b.onresize = function() { viewer.zoom(); itemlist.resize(); };

    // browser with sessions: update URL when browser window closed
    b.onbeforeunload = function() { updateUrl(true); };

    // navigation
    createNavigation(
			document.getElementById("next"),
			document.getElementById("prev"),
			document.getElementById("list") );

    go(n);
}//}}}

// number of items in gallery
var len = ls ? ls.length : 0;

// variables
var vars = getUrlVars();

// page number
var n = getPage( parseInt(vars['n']) );

// zoom
var zoom_step  = 0.125;

// body
var b;

var hash;

var itemlist, info, viewer, help;
var preloaded = null;

var lasticon;

var keys;
var keydesc;
var modes = {any:"Any", viewer:"Viewer", itemlist:"Item List", help:"Help"};
var mode = [modes.viewer];

