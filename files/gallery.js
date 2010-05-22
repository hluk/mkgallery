/*
 * HTML document should include:
 *   - <script type="text/javascript" src="files/gallery.js"></script>
 *   - <body onload="onLoad()">
 *   - <div id="canvas></canvas>
 */

//! \class Viewer
//{{{
// events:
//   onBeforeLoad()
//   onLoad(width,height);
//   onError(error_msg);
//   onZoomChanged(zoom_state)
var Viewer = function(e) {
    this.init(e);
};

Viewer.prototype = {
init: function (e)//{{{
{
    this.e = e;
    this.zoom_state = 1;
    this.viewFactory = new ViewFactory(this);
},//}}}

/**
 * \param how "fit" (fit to window), "fill" (fill window), float (zoom factor), other (restore default zoom factor)
 */
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
    this.e.style.top = newtop > 0 ? newtop : 0;

    if ( this.zoom_state != z ) {
        this.zoom_state = z;
        if (this.onZoomChanged)
            this.onZoomChanged(z);
    }

},//}}}

preloadImages: function (num)//{{{
{
    this.preload_imgs = [];
    for(var i = 0; i < Math.min(num,len); ++i) {
        this.preload_imgs[i] = new Image();
        this.preload_imgs[i].src = path(ls[n+i]);
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

    if (this.onBeforeLoad)
        this.onBeforeLoad();
    this.view = this.viewFactory.newView( filepath, this );
    if ( this.view )
        this.view.show();
    else {
        if (this.onError)
            this.onError("Unknown format: \""+filepath+"\"");
    }
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
    else if (filepath.search(/\.(ttf|otf)$/i) > -1)
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

show: function()//{{{
{
    if ( this.e )
        return;

    if ( this._parent.onUpdateMessage )
        this._parent.onUpdateMessage("loading","loading");

    // TODO: SVG -- for some reason this doesn't work in Chromium
    if (this.path.search(/\.svg$/i) > -1) {
        this.e = document.createElement("embed");
    }
    else {
        this.e = document.createElement("img");
    }
    this.e.src = this.path;
    this.e.className = "imageview";
    this.e.name = "view";

    var view = this;
    this.e.onload = function () {
        view.orig_width = this.width;
        view.orig_height = this.height;
        view._parent.zoom();
        if ( view._parent.onUpdateMessage )
            view._parent.onUpdateMessage(this.width+"x"+this.height);
    };

    this._parent.append(this.e);
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

    var thumbpath = "thumbs/" + this.path.replace(/^.*[\/\\]/,'').replace(/\.[^.]*$/,'.png');

    this.thumb = document.createElement("img");
    this.thumb.src = thumbpath;
    this.thumb.className = "thumbnail";
    this.thumb.src = thumbpath;

    var view = this;
    this.thumb.onload = function () { view._parent.thumbnailOnLoad(view); };

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

    this.width = this.e.width = w*z;
    this.height = this.e.height = h*z;

    this.zoom_factor = z;

    this._parent.zoomChanged(how,this.zoom_factor);
},//}}}

width: function ()//{{{
{
    return this.e.width;
},//}}}

height: function ()//{{{
{
    return this.e.height;
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
    this.font = this.path.replace(/[^a-zA-Z0-9_]/g,"_");
},//}}}

show: function()//{{{
{
    if (this.e)
        return;

    this.e = document.createElement("div");
    this.e.src = this.path;
    this.e.className = "fontview";
    this.e.name = "view";

    this.ee = document.createElement("div");
    this.ee.innerText = config['font_test'];
    this.ee.style.fontFamily = this.font;
    this.e.appendChild(this.ee);

    this._parent.append(this.e);
    this._parent.zoom();
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
    this.thumb.className = "thumbnail";
    this.thumb.style.fontFamily = this.font;
    this.thumb.style.fontSize = 16;
    this.thumb.innerText = config['thumbnail_font_test'];

    this._parent.thumbnailOnLoad(this);

    return this.thumb;
},//}}}

zoom: function (how)//{{{
{
    if ( !this.orig_height )
        this.orig_height = this.e.offsetHeight;

    var z = this.zoom_factor;

    switch(how) {
    case "+":
        z *= 1+zoom_step;
        break;
    case "-":
        z /= 1+zoom_step;
        break;
    default:
        z = how ? parseFloat(how) : 1;
        break;
    }

    this.ee.style.fontSize = z+"em";
    this.height = this.e.offsetHeight;

    this.zoom_factor = z;

    this._parent.zoomChanged(how,this.zoom_factor);
},//}}}

width: function ()//{{{
{
    return this.e.width;
},//}}}

height: function ()//{{{
{
    return this.e.height;
},//}}}
}
//}}}

//! \class ItemList
//{{{
var ItemList = function(e) { this.init(e); };

ItemList.prototype = {
init: function (e)//{{{
{
    this.e = e;
    if (!this.e)
        return null;

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

    var thumb = this.viewFactory.newView( ls[i] );
    thumb.id = i;
    var e = thumb.thumbnail();
    // show thumbnail only if src exists
    e.style.display = "none";
    items[i].appendChild(e);
},//}}}

thumbnailOnLoad: function(thumb)//{{{
{
    this.thumbs.push( thumb.thumbnail() );

    var i = thumb.id;
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
    item.id = i;
    item.className = "item";
    item.onclick = function() {
        go(this.id);
    }

    // image identification
    var ident = document.createElement('div');
    ident.className = "itemident";
    ident.innerHTML = i;

    // item text
    var txt = document.createElement('div');
    txt.className = "itemname";
    txt.appendChild( document.createTextNode(itemname) );

    item.appendChild(ident);
    item.appendChild(txt);

    this.e.appendChild(item);
    this.items.push(item);
},//}}}

reloadThumbnails: function ()//{{{
{
    var thumb;
    while ( thumb = this.thumbs.pop() ) {
        thumb.style.display = "";
        thumb.parentNode.style.maxWidth = thumb.width > 200 ? thumb.width : 200;
    }
    this.updateSelection();
    this.ensureCurrentVisible();
},//}}}

toggle: function ()//{{{
{
    // are items loaded?
    if ( !this.items ) {
        this.items = new Array();

        for(var i=0; i<len; ++i)
            this.appendItem(ls[i], i+1);

        // add thumbnails
        this.thumbs = new Array();
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

ensureCurrentVisible: function ()//{{{
{
    var y = getTop(this.selection);
    var d = y + this.selection.offsetHeight - window.pageYOffset - window.innerHeight;
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
        this.selection.style.left = getLeft(e);
        this.selection.style.top = getTop(e);
        this.selection.style.width = e.offsetWidth;
        this.selection.style.height = e.offsetHeight;
    }
},//}}}

listUp: function ()//{{{
{
    var sel = this.items[this.selected];
    var x = getLeft(sel) - window.pageXOffset + sel.offsetWidth/2;

    // select next
    for( var i = this.selected-1; i >= 0; --i) {
        var e = this.items[i];
        var nx = getLeft(e);
        if ( nx <= x && nx+e.offsetWidth >= x ) {
           // deselect current and select new
           this.selectItem(i);
           this.ensureCurrentVisible();
           break;
        }
    }
},//}}}

listDown: function ()//{{{
{
    var sel = this.items[this.selected];
    var x = getLeft(sel) - window.pageXOffset + sel.offsetWidth/2;
    var y = getTop(sel) - window.pageYOffset;

    // select next
    for( var i = this.selected+1; i < this.items.length; ++i) {
        var e = this.items[i];
        var nx = getLeft(e);
        if ( nx <= x && nx+e.offsetWidth >= x ) {
           // deselect current and select new
           this.selectItem(i);
           this.ensureCurrentVisible();
           break;
        }
    }
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
    var min_pos = selection.offsetTop+window.innerHeight;
    var i = this.selected;
    while ( ++i < len && min_pos > this.get(i).offsetTop );
    this.selectItem(i-1);
    window.scrollTo( 0, getTop(selection) );
},//}}}

listPageUp: function ()//{{{
{
    var min_pos = selection.offsetTop-window.innerHeight;
    var i = this.selected;
    while ( --i > 0 && min_pos < this.get(i).offsetTop );
    this.selectItem(i+1);
    window.scrollTo( 0, getTop(selection) );
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
var Info = function(e,counter,itemtitle,resolution) {
    this.init(e,counter,itemtitle,resolution);
};

Info.prototype = {
init: function(e,counter,itemtitle,resolution)//{{{
{
    this.e = e;
    this.e.style.display = "none";
	this.counter = counter;
	this.itemtitle = itemtitle;
    this.resolution = resolution;
},//}}}

updateCounter: function ()//{{{
{
    if (!this.counter)
        return;
	this.counter.innerText = this.n + "/" + this.len;
    if (this.n == this.len)
        this.counter.className = "last";
    else
        this.counter.className = "";
},//}}}

updateItemTitle: function ()//{{{
{
	var l = document.getElementById("link");
    if (l)
        this.itemtitle.removeChild(l);

    l = document.createElement('a');
    l.id = "link";
	l.href = "imgs/" + this.name();
	l.appendChild(document.createTextNode( this.name() ));
	this.itemtitle.appendChild(l);
},//}}}

updateStatus: function (status_msg,class_name)//{{{
{
    if (!this.resolution)
        return;

    this.resolution.innerText = status_msg;
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
    this.updateItemTitle();
},//}}}

popInfo : function ()//{{{
{
    this.e.style.display = "";
    if (this.info_t)
        clearTimeout(this.info_t);
    var t = this;
    this.info_t = setTimeout(function(){t.e.style.display = "none";},4000);
},//}}}

hidden: function()//{{{
{
    return this.e.style.display == "none";
},//}}}
}
//}}}


// HELPER FUNCTIONS//{{{
function path (filename)
{
    return "imgs/" + filename;
}
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

    n = vars["n"] = pg;

    var itemname = ls[n-1];
    viewer.show( itemname );
    info.updateInfo(itemname,n,len);
    info.popInfo();

    updateTitle();

    if (itemlist) {
        if( !itemlist.hidden() )
            itemlist.toggle();
        itemlist.selectItem(n-1);
    }
    window.scrollTo(0,0);

    updateUrl();
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
//}}}

// INTERACTION//{{{
keycodes = {
    13: "Enter",
    27: "Escape",
    37: "Left",
    38: "Up",
    39: "Right",
    40: "Down",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home"
}

function keyDown (e)//{{{
{
    if ( e.shiftKey || e.ctrlKey || e.altKey || e.metaKey )
        return;

	var keycode = e.which;
	var keyname;

    keyname = keycodes[keycode];
    if ( !keyname )
		keyname = String.fromCharCode(keycode);
    //alert(keycode +";"+ keyname);

    if ( !itemlist || itemlist.hidden() ) {//{{{
        switch (keyname) {
        case "Left":
            if ( viewer.view.width <= window.innerWidth )
                go(n-1);
            else
                window.scrollBy(-window.innerWidth/4,0);
            break;
        case "Right":
            if ( viewer.view.width <= window.innerWidth )
                go(n+1);
            else
                window.scrollBy(window.innerWidth/4,0);
            break;
        case "Up":
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                info.popInfo();
            break;
        case "Down":
            window.scrollBy(0,window.innerHeight/4);
            break;
        case "PageUp":
            window.scrollBy(0,-window.innerHeight);
            if ( window.pageYOffset == 0 )
                info.popInfo();
            break;
        case "PageDown":
            window.scrollBy(0,window.innerHeight);
            break;
        case "End":
            window.scrollTo(0,document.body.scrollHeight);
            break;
        case "Home":
            window.scrollTo(0,0);
            info.popInfo();
            break;
        case "a":
            go(len);
            break;
        case "b":
            window.scrollBy(0,window.innerHeight/4);
            break;
        case "c":
            go(n+5);
            break;
        case "d":
            go(n-1);
            break;
        case "Enter":
        case "f":
            go(n+1);
            break;
        case "g":
            go(1);
            break;
        case "h":
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                info.popInfo();
            break;
        case "i":
            go(n-5);
            break;
        case "+":
        case "k":
            viewer.zoom("+");
            break;
        case "-":
        case "m":
            viewer.zoom("-");
            break;
        case "*":
        case "j":
            viewer.zoom(1);
            break;
        case "/":
        case "o":
            viewer.zoom("fit");
            break;
        case ".":
        case "n":
            viewer.zoom("fill");
            break;
        case "e":
            if (itemlist)
                itemlist.toggle();
            break;
        }
	}//}}}
    else {//{{{
        switch (keyname) {
        case "Escape":
        case "e":
            itemlist.toggle();
            break;
            itemlist.toggle();
            break;
        case "Enter":
            itemlist.submitSelected();
            break;
        case "Left":
        case "d":
            itemlist.listLeft();
            break;
        case "Right":
        case "f":
            itemlist.listRight();
            break;
        case "Up":
        case "h":
            itemlist.listUp();
            break;
        case "Down":
        case "b":
            itemlist.listDown();
            break;
        case "PageUp":
        case "i":
            itemlist.listPageUp();
            break;
        case "PageDown":
        case "c":
            itemlist.listPageDown();
            break;
        case "End":
        case "a":
            itemlist.selectItem(itemlist.size()-1);
            itemlist.ensureCurrentVisible();
            break;
        case "Home":
        case "g":
            itemlist.selectItem(0);
            itemlist.ensureCurrentVisible();
            break;
        }
	}//}}}
}//}}}

function onMouseWheel (e) {//{{{
    var delta = e.wheelDelta/3;
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
        if (e.button == 0 && (e.target.id == "canvas" || e.target.id == "view")) {
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
    itemlist = new ItemList(e);
    // item list is initially hidden
    if ( !itemlist && document.getElementById("itemlist") )
        document.getElementById("itemlist").style.display = "none";
}//}}}

function createViewer(e,info)//{{{
{
    viewer = new Viewer(e);
    if (info) {
        viewer.onUpdateMessage = function(msg,class_name) { info.updateStatus( msg, class_name ); }
        viewer.onError = function(msg) { info.updateStatus( msg, "error" ); }
        viewer.onZoomChanged = function(state) { if (vars["zoom"] == state) return; vars["zoom"] = state; updateUrl(); }
    }
}//}}}

function onLoad()//{{{
{
    var e;

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
                document.getElementById("resolution"));
    }

    // viewer
    e = document.getElementById("canvas");
    if (e)
        createViewer(e,info);

    // refresh zoom on resize
    b.onresize = function() { viewer.zoom(); };

    // browser with sessions: update URL when browser window closed
    b.onbeforeunload = function() { updateUrl(true); };

    // keyboard
    document.addEventListener("keydown", keyDown, false);
    // mouse
    document.onmousewheel = onMouseWheel;
    initDragScroll();

    go(n);
}//}}}

// number of items in gallery
var len = ls.length;

// variables
var vars = getUrlVars();

// page number
var n = getPage( parseInt(vars["n"]) );

// zoom
var zoom_step  = 0.125;

// body
var b;

var itemlist, info, viewer;
var hash;
var timers = new Array();

