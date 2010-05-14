/*
 * HTML document should include:
 *   - <script type="text/javascript" src="files/gallery.js"></script>
 *   - <body onload="onLoad()">
 *   - <div id="canvas></canvas>
 */

function addTimeout(action, msec)//{{{
{
    timers.push( window.setTimeout(action,msec) );
}//}}}

function zoom()//{{{
{
	if (!document.all&&!document.getElementById)
		return;

	var ww = window.innerWidth;
	var wh = window.innerHeight;

	if ( zoom_state == "fit" )
		if (w > ww || h > wh)
			zoom_factor = ( ww*h < wh*w ) ? ww/w : wh/h;
		else
			zoom_factor = 1;
	else if ( zoom_state == "fill" )
			zoom_factor = ( ww*h < wh*w ) ? wh/h : ww/w;

    var nw = w*zoom_factor;
    var nh = h*zoom_factor;
    img.width = nw;
    img.height = nh;

    // center image in window
    newtop = (wh-nh)/2;
    canvas.style.top = newtop > 0 ? newtop : 0;

    var newzoom = zoom_state ? zoom_state : zoom_factor;
    if  (newzoom != vars["zoom"] ) {
        vars["zoom"] = newzoom;
        updateUrl();
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

// IMAGE LIST//{{{
function createList()//{{{
{
    if (imglist)
        return; // image list already created
    imglist = document.getElementById("imglist");
    if (!imglist)
        return;

    imglist.style.display = "none";
    imglist_hidden = true;

    // add thumbnails
    for(var i=0; i<len; ++i) {
        var imgpath = ls[i];
        var imgitem = newItem(imgpath, i+1);
        imglist.appendChild(imgitem);
    }

    items = document.getElementsByClassName("imgitem");
    addThumbnails(n-1);

    // moving selection cursor is faster than changing style of current item
    selection = document.createElement("div");
    selection.id = "selection";
    imglist.appendChild(selection);

    // select current
    selectItem(n-1);
    selection_needs_update = true;
}//}}}

function addThumbnails(i)//{{{
{
    if(i<0 || i>=len)
        return;

    var imgpath = ls[i];
    var thumbpath = "thumbs/" + imgpath.replace(/^.*[\/\\]/,'').replace(/\.[^.]*$/,'.png');

    // thumbnail
    var thumb = document.createElement('img');
    thumb.className = "thumbnail";
    thumb.src = thumbpath;

    // show thumbnail only if src exists
    thumb.style.display = "none";
    items[i].appendChild(thumb);
    // recursively load thumbnails from currently viewed
    // - flood load:
    //      previous and next thumbnails (from current) are loaded in paralel
    thumb.onerror = thumb.onload = function() {
        thumbs.push(this);
        if (i+1>=n)
            addThumbnails(i+1);
        if (i+1<=n)
            addThumbnails(i-1);
    };
}//}}}

function newItem(imgname, i)//{{{
{
    var l = document.createElement('div');
    l.id = i;
    l.className = "imgitem";
    l.onclick = function() {
        go(this.id);
    }

    // image identification
    var ident = document.createElement('div');
    ident.className = "imgident";
    ident.innerHTML = i;

    // item text
    var txt = document.createElement('div');
    txt.className = "imgname";
    txt.appendChild( document.createTextNode(imgname) );

    l.appendChild(ident);
    l.appendChild(txt);

    return l;
}//}}}

function reloadThumbnails()//{{{
{
    var thumb;
    while ( thumb = thumbs.pop() ) {
        thumb.style.display = "";
        thumb.parentNode.style.maxWidth = thumb.width > 200 ? thumb.width : 200;
    }
    updateSelection();
    ensureVisible(selection);
}//}}}

function toggleList()//{{{
{
    if (!imglist)
        createList();
    if (!imglist)
        return;

    var lastpos2 = [window.pageXOffset,window.pageYOffset];
    imglist.style.display = imglist_hidden ? "" : "none";
    window.scrollTo(lastpos[0],lastpos[1]);
    lastpos = lastpos2;
    imglist_hidden = !imglist_hidden;

    if ( !imglist_hidden ) {
        if ( thumbs.length )
            reloadThumbnails();
        if ( selection_needs_update ) {
            updateSelection();
            ensureVisible(selection);
        }
    }
}//}}}

function ensureVisible(e)//{{{
{
    var y = getTop(e);
    var d = y + e.offsetHeight - window.pageYOffset - window.innerHeight;
    if ( d > 0 )
        window.scrollBy(0,d);
    if ( y < window.pageYOffset )
        window.scrollTo(window.pageXOffset,y);
}//}}}

function updateSelection()//{{{
{
    if ( imglist_hidden )
        selection_needs_update = true;
    else {
        selection_needs_update = false;
        selectItem(selected);
    }
}//}}}

function selectItem(i)//{{{
{
    if (!imglist)
        return;

    var sel = items[selected];
    var e = items[i];

    if(sel)
        sel.id = "";
    e.id = "selected";
    selected = i;

    if ( imglist_hidden )
        selection_needs_update = true;
    else {
        // move selection cursor
        selection.style.left = getLeft(e);
        selection.style.top = getTop(e);
        selection.style.width = e.offsetWidth;
        selection.style.height = e.offsetHeight;
    }
}//}}}

function listUp()//{{{
{
    if (!imglist)
        return;

    var sel = items[selected];
    var x = getLeft(sel) - window.pageXOffset + sel.offsetWidth/2;

    // select next
    for( var i = selected-1; i >= 0; --i) {
        var e = items[i];
        var nx = getLeft(e);
        if ( nx <= x && nx+e.offsetWidth >= x ) {
           // deselect current and select new
           selectItem(i);
           ensureVisible(selection);
           break;
        }
    }
}//}}}

function listDown()//{{{
{
    if (!imglist)
        return;

    var sel = items[selected];
    var x = getLeft(sel) - window.pageXOffset + sel.offsetWidth/2;
    var y = getTop(sel) - window.pageYOffset;

    // select next
    for( var i = selected+1; i < items.length; ++i) {
        var e = items[i];
        var nx = getLeft(e);
        if ( nx <= x && nx+e.offsetWidth >= x ) {
           // deselect current and select new
           selectItem(i);
           ensureVisible(selection);
           break;
        }
    }
}//}}}

function listRight()//{{{
{
    if (!imglist)
        return;

    // select next
    var i = selected+1;
    if ( i >= items.length )
        return;

    // deselect current and select new
    selectItem(i);
    ensureVisible(selection);
}//}}}

function listLeft()//{{{
{
    if (!imglist)
        return;

    // select next
    var i = selected-1;
    if ( i < 0 )
        return;

    // deselect current and select new
    selectItem(i);
    ensureVisible(selection);
}//}}}
//}}}

// IMAGE INFO//{{{
function updateCounter()//{{{
{
	var counter = document.getElementById("counter");
    if (!counter)
        return;
	counter.innerText = n + "/" + len;
    if (n == len)
        counter.className = "last";
    else
        counter.className = "";
}//}}}

function updateImgTitle()//{{{
{
	var imgtitle = document.getElementById("imgtitle");
	var l = document.getElementById("link");
    if (l)
        imgtitle.removeChild(l);

    l = document.createElement('a');
    l.id = "link";
	l.href = "img/" + imgpath;
	l.appendChild(document.createTextNode(imgname));
	imgtitle.appendChild(l);
}//}}}

function updateStatus()//{{{
{
    if (!resolution)
        resolution = document.getElementById("resolution");
    if (!resolution)
        return;

    $(resolution).stop(true,true);
	resolution.innerText = "...loading...";
    resolution.className = "loading";
}//}}}

function updateImageInfo()//{{{
{
    // image filename and path
    imgname = ls[n-1];
    imgpath = encodeURIComponent(imgname);

	info = document.getElementById("info");
    if(!info)
        return;

    popInfo();
    updateCounter();
    updateImgTitle();
    updateStatus();
}//}}}
//}}}

// INTERACTION//{{{
function keyDown(e)//{{{
{
    if ( e.shiftKey || e.ctrlKey || e.altKey || e.metaKey )
        return;

	var keycode = e.which;
	var keyname;

    keyname = keycodes[keycode];
    if ( !keyname )
		keyname = String.fromCharCode(keycode);
    //alert(keycode +";"+ keyname);

    if (imglist_hidden) {//{{{
        switch (keyname) {
        case "Left":
            if ( img.width <= window.innerWidth )
                go(n-1);
            else
                window.scrollBy(-window.innerWidth/4,0);
            break;
        case "Right":
            if ( img.width <= window.innerWidth )
                go(n+1);
            else
                window.scrollBy(window.innerWidth/4,0);
            break;
        case "Up":
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                popInfo();
            break;
        case "Down":
            window.scrollBy(0,window.innerHeight/4);
            break;
        case "PageUp":
            window.scrollBy(0,-window.innerHeight);
            if ( window.pageYOffset == 0 )
                popInfo();
            break;
        case "PageDown":
            window.scrollBy(0,window.innerHeight);
            break;
        case "End":
            window.scrollTo(0,document.body.scrollHeight);
            break;
        case "Home":
            window.scrollTo(0,0);
            popInfo();
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
                popInfo();
            break;
        case "i":
            go(n-5);
            break;
        case "+":
        case "k":
            zoom_state = null;
            if ( zoom_factor > zoom_step )
                zoom_factor += zoom_step;
            else
                zoom_factor /= 0.8;
            zoom();
            break;
        case "-":
        case "m":
            zoom_state = null;
            if ( zoom_factor > zoom_step )
                zoom_factor -= zoom_step;
            else
                zoom_factor *= 0.8;
            zoom();
            break;
        case "*":
        case "j":
            zoom_state = null;
            zoom_factor = 1;
            zoom();
            break;
        case "/":
        case "o":
            zoom_state = 'fit';
            zoom();
            break;
        case ".":
        case "n":
            zoom_state = 'fill';
            zoom();
            break;
        case "e":
            toggleList();
            break;
        }
	}//}}}
    else {//{{{
        switch (keyname) {
        case "Escape":
        case "e":
            toggleList();
            break;
            toggleList();
            break;
        case "Enter":
            go(selected+1);
            break;
        case "Left":
        case "d":
            listLeft();
            break;
        case "Right":
        case "f":
            listRight();
            break;
        case "Up":
        case "h":
            listUp();
            break;
        case "Down":
        case "b":
            listDown();
            break;
        case "PageUp":
        case "i":
            var min_pos = selection.offsetTop-window.innerHeight;
            var i = selected;
            while ( --i > 0 && min_pos < items[i].offsetTop );
            selectItem(i+1);
            window.scrollTo( 0, getTop(selection) );
            break;
            break;
        case "PageDown":
        case "c":
            var min_pos = selection.offsetTop+window.innerHeight;
            var i = selected;
            while ( ++i < len && min_pos > items[i].offsetTop );
            selectItem(i-1);
            window.scrollTo( 0, getTop(selection) );
            break;
        case "End":
        case "a":
            selectItem(items.length-1);
            ensureVisible(selection);
            break;
        case "Home":
        case "g":
            selectItem(0);
            ensureVisible(selection);
            break;
        }
	}//}}}
}//}}}

function onMouseWheel(e) {//{{{
    var delta = e.wheelDelta/3;
    window.scroll(window.pageXOffset,window.pageYOffset-delta);
    e.preventDefault();
    if ( window.pageYOffset == 0 )
        popInfo();
}//}}}

function initDragScroll()//{{{
{
    var x,y;
    var dragging = false;

    document.addEventListener("mousedown",startDragScroll,false);
    document.addEventListener("mouseup",stopDragScroll,false);
    document.addEventListener("mousemove",dragScroll,false);

    function startDragScroll(e) {
        if (e.button == 0 && (e.target.id == "canvas" || e.target.id == "myimage")) {
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
                popInfo();
        }
    }
}//}}}
//}}}

function updateUrl()//{{{
{
    hash = "";

    for (var key in vars)
        hash += (hash ? "&" : "") + key + "=" + vars[key];

    if ( hash != location.hash ) {
        // if url is updated instantly cannot browse images rapidly
        addTimeout( 'if( hash == "'+hash+'" ) location.hash = "#'+hash+'";',1000 );
    }
}//}}}

function getUrlVars()//{{{
{
	var map = {};
	var parts = location.hash.replace(/[#&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		map[key] = value;
	});
	return map;
}//}}}

function popInfo()//{{{
{
    if ( !info || !info_hidden )
        return;
    imginfo_hidden = false;

    $(info).stop(true,true);
    $(info).fadeIn("slow");
    addTimeout(
            '$(info).fadeOut( "slow", function(){ info_hidden = true; } );',
            4000);
}//}}}

function preloadImages()//{{{
{
    // preload 5 images at most
    // this will hopefully save some energy on laptops with classic hard drive
    var m = (n-1)%5+1;
    preload_imgs = [];
    for(var i = 0; i<m; ++i) {
        preload_imgs[i] = new Image();
        preload_imgs[i].src = "imgs/" + encodeURIComponent(ls[n+i]);
    }
}//}}}

function imgOnLoad()//{{{
{
	w = this.width;
    h = this.height;

	zoom();

    if ( resolution ) {
        $(resolution).fadeOut("slow",
                function(){
                    resolution.innerText = w+"x"+h;
                    resolution.className = "";
                    $(resolution).fadeIn("slow");
                });
    }
    popInfo();
    preloadImages();

    if ( document.getElementById("imglist") )
        document.getElementById("imglist").style.display = "none";
}//}}}

function getPage(i)//{{{
{
	if (!i || i<1)
		return 1;
	else if (i > len)
		return len;
	else
		return i;
}//}}}

function go(i)//{{{
{
	var pg = getPage(i);
    if( !imglist_hidden )
        toggleList();

    var t;
    while(t = timers.pop())
        clearTimeout(t);

    n = vars["n"] = pg;
    updateImageInfo();
    showImage();
    updateTitle();
    updateUrl();
    selectItem(n-1);
    window.scrollTo(0,0);
}//}}}

function showImage()//{{{
{
    img = document.getElementById("myimage");
    if (img)
        canvas.removeChild(img);

    // TODO: SVG -- for some reason this doesn't work in Chromium
    if (imgpath.search(/\.svg$/i) > -1) {
        img = document.createElement("embed");
        img.src = "imgs/" + imgpath;
    }
    else {
        img = document.createElement("img");
        img.src = "imgs/" + imgpath;
    }
    img.id = "myimage";
    img.name = "myimage";
    img.onload = imgOnLoad;
    canvas.appendChild(img);
}//}}}

function updateTitle()//{{{
{
    // title format: GALLERY_NAME: n/N "image.png"
    document.title =
        (title ? title : "untitled") + ": " +
        n + "/" + len +
        ' "' + imgname + '"';
}//}}}

function onLoad()//{{{
{
    b = document.getElementsByTagName('body')[0];
    canvas = document.getElementById('canvas');
    if (!canvas) {
        alert("Missing canvas element in HTML!");
        return;
    }

    // mousewheel on canvas/image
    document.onmousewheel = onMouseWheel;

    document.body.style.overflow = 'hidden';

    updateImageInfo();
    showImage();
    updateTitle();

    initDragScroll();

    // refresh zoom on resize
    b.onresize = zoom;
}//}}}

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

// number of items in gallery
var len = ls.length;

// variables
var vars = getUrlVars();

// page number
var n = getPage( parseInt(vars["n"]) );

// zoom
var zoom_step  = 0.125;
var zoom_state = vars["zoom"];
var zoom_factor;
if ( zoom_state != "fit" && zoom_state != "fill") {
	zoom_factor = parseFloat(zoom_state);
	if (!zoom_factor)
		zoom_factor = 1.0;
}

// image width and height
var w, h;

// handle keydown
document.addEventListener("keydown", keyDown, false);

var imgname, imgpath;
var b, canvas, img, preload_imgs, info, resolution;
var imglist, items, selection, selected, thumbs;
var selection_needs_update;
var info_hidden = true;
var imglist_hidden = true;
var lastpos = [0,0];
var hash;
var timers = new Array();
var thumbs = new Array();

