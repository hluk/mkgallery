/*
 * HTML document should include:
 *   - <script type="text/javascript" src="files/gallery.js"></script>
 *   - <body onload="onLoad()">
 *   - <canvas id="canvas></canvas>
 *   - form:
 *   <form name="navigation" method="get">
 *     <input type="hidden" name="zoom" value="1" />
 *     <input type="hidden" name="n" value="0" />
 *   </form>
 */

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

function toggleList()//{{{
{
    var lastpos2 = [window.pageXOffset,window.pageYOffset];
    imglist.style.display = list_hidden ? "" : "none";
    window.scrollTo(lastpos[0],lastpos[1]);
    lastpos = lastpos2;
    list_hidden = !list_hidden;

    if ( !list_hidden && selection_needs_update ) {
        updateSelection();
        ensureVisible(selection);
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
    if ( list_hidden )
        selection_needs_update = true;
    else {
        selection_needs_update = false;
        selectItem(selected);
    }
}//}}}

function selectItem(i)//{{{
{
    var sel = document.getElementById('selected');
    var e = items[i];

    if(sel)
        sel.id = "";
    e.id = "selected";
    selected = i;

    // move selection cursor
    selection.style.left = getLeft(e);
    selection.style.top = getTop(e);
    selection.style.width = e.offsetWidth;
    selection.style.height = e.offsetHeight;
}//}}}

function listUp()//{{{
{
    var sel = document.getElementById('selected');
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
    var sel = document.getElementById('selected');
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
    // select next
    var i = selected-1;
    if ( i < 0 )
        return;

    // deselect current and select new
    selectItem(i);
    ensureVisible(selection);
}//}}}

function keyDown(e)//{{{
{
	var keycode = e.which;
	var keyname;

    keyname = keycodes[keycode];
    if ( !keyname )
		keyname = String.fromCharCode(keycode);
    //alert(keycode +";"+ keyname);

	switch (keyname) {
    case "Enter":
        if ( !list_hidden ) {
            var sel = document.getElementById("selected");
            var num = sel.firstChild.firstChild.data;
            var a = num.search(/\(/);
            var b = num.search(/\)/);
            go( num.substring(a+1, b-a) );
        }
        else
            go(n+1);
        break;
    case "Escape":
        if ( !list_hidden )
            toggleList();
        break;
	case "Left":
        if ( list_hidden ) {
            if ( img.width <= window.innerWidth )
                go(n-1);
            else
                window.scrollBy(-window.innerWidth/4,0);
        }
        else
            listLeft();
		break;
	case "Up":
        if ( list_hidden ) {
            window.scrollBy(0,-window.innerHeight/4);
            if ( window.pageYOffset == 0 )
                popInfo();
        }
        else
            listUp();
		break;
	case "Right":
        if ( list_hidden ) {
            if ( img.width <= window.innerWidth )
                go(n+1);
            else
                window.scrollBy(window.innerWidth/4,0);
        }
        else
            listRight();
		break;
	case "Down":
        if ( list_hidden )
            window.scrollBy(0,window.innerHeight/4);
        else
            listDown();
		break;
	case "PageUp":
        if ( list_hidden ) {
            window.scrollBy(0,-window.innerHeight);
            if ( window.pageYOffset == 0 )
                popInfo();
        }
        else {
            // TODO: optimize
            var d = window.pageYOffset;
            var sel;
            do {
                var sel = document.getElementById("selected");
                listUp(-window.innerHeight);
            } while ( d-window.pageYOffset < window.innerHeight && sel != document.getElementById("selected") );
        }
		break;
	case "PageDown":
        if ( list_hidden )
            window.scrollBy(0,window.innerHeight);
        else {
            // TODO: optimize
            var d = window.pageYOffset;
            var sel;
            do {
                var sel = document.getElementById("selected");
                listDown(window.innerHeight);
            } while ( window.pageYOffset-d < window.innerHeight && sel != document.getElementById("selected") );
        }
		break;
    case "End":
        if ( list_hidden )
            window.scrollTo(0,document.body.scrollHeight);
        else {
            selectItem(items.length-1);
            ensureVisible(selection);
        }
        break;
    case "Home":
        if ( list_hidden )
            window.scrollTo(0,0);
        else {
            selectItem(0);
            ensureVisible(selection);
        }
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
	case "k":
		zoom_state = null;
        if ( zoom_factor > zoom_step )
            zoom_factor += zoom_step;
        else
            zoom_factor /= 0.8;
		zoom();
		break;
	case "m":
		zoom_state = null;
        if ( zoom_factor > zoom_step )
            zoom_factor -= zoom_step;
        else
            zoom_factor *= 0.8;
		zoom();
		break;
	case "j":
		zoom_state = null;
		zoom_factor = 1;
		zoom();
		break;
	case "o":
		zoom_state = 'fit';
		zoom();
		break;
	case "n":
		zoom_state = 'fill';
		zoom();
		break;
	case "e":
        toggleList();
		break;
	}
}//}}}

function initDragScroll()//{{{
{
    var x,y;

    document.addEventListener("mousedown",startDragScroll,false);
    document.addEventListener("mouseup",stopDragScroll,false);
    document.addEventListener("mousemove",dragScroll,false);

    function startDragScroll(e){
        if (e.button == 0 && (e.target.id == "canvas" || e.target.id == "myimage")) {
            x = window.pageXOffset + e.clientX;  
            y = window.pageYOffset + e.clientY;
            e.stop();
        }
    }

    function stopDragScroll(e){ 
        x = false;
    }

    function dragScroll(e) {
        if (x) {
            window.scroll(x-e.clientX,y-e.clientY);
            e.stop();
            if ( window.pageYOffset == 0 )
                popInfo();
        }
    }
}//}}}

function getUrlVars()//{{{
{
	var map = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		map[key] = value;
	});
	return map;
}//}}}

function popInfo()//{{{
{
    if ( !info_hidden )
        return;
    info_hidden = false;
	Effect.Appear('info',{duration:1});
	window.setTimeout("Effect.Fade('info',{duration:0.3}); window.setTimeout(\"info_hidden = true;\",500);",3000);
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

	window.setTimeout("Effect.Fade('resolution',{duration:1});window.setTimeout(\"Element.hide('resolution');document.getElementById('resolution').innerText = w+'x'+h; Effect.Appear('resolution', {duration:0.5});\",1000);",20);
    popInfo();
    preloadImages();
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
	if ( pg != n ) {
		Effect.Squish('info',{duration:5});
		document.navigation.n.value = pg;
		document.navigation.zoom.value = (zoom_state) ? zoom_state : zoom_factor;
		document.navigation.submit();
	}
}//}}}

function showImageInfo()//{{{
{
	var info = document.createElement('div');
	var counter = document.createElement('span');
	var imgtitle = document.createElement('span');
	var resolution = document.createElement('span');

	info.id = "info";
	
	counter.id = "counter";
	counter.innerText = n + "/" + len;
	if (n == len) new Effect.Pulsate(counter,{pulses:10,duration:5});

	imgtitle.id = "imgtitle";
	var l = document.createElement('a');
	l.href = "img/" + imgpath;
	l.appendChild(document.createTextNode(imgname));
	imgtitle.appendChild(l);

	resolution.id = "resolution";
	var loading = document.createElement('span');
	loading.id = "loading";
	loading.innerText = "...loading...";
	resolution.appendChild(loading);

	info.appendChild(counter);
	info.appendChild(imgtitle);
	info.appendChild(resolution);
	b.appendChild(info);
}//}}}

function showImage()//{{{
{
    img = document.createElement('img');
    img.src = "imgs/" + imgpath;
    img.id = "myimage";
    img.name = "myimage";
    img.onload = imgOnLoad;
    canvas.appendChild(img);
}//}}}

function newItem(thumbpath, imgname)//{{{
{
    var l = document.createElement('div');
    l.className = "imgitem";
    l.onclick = function() {
        document.navigation.n.value = this.id;
        document.navigation.submit();
    }

    // item text
    var txt = document.createElement('div');
    txt.className = "imgname";
    txt.appendChild( document.createTextNode(imgname) );

    // thumbnail
    var thumb = document.createElement('img');
    thumb.className = "thumbnail";
    thumb.src = thumbpath;

    // show thumbnail only if src exists
    thumb.style.display = "none";
    thumb.onload = function() {
        this.style.display = "";
        this.parentNode.style.maxWidth = this.width > 200 ? this.width : 200;
        updateSelection();
    };

    l.appendChild(txt);
    l.appendChild(thumb);

    return l;
}//}}}

function createList()//{{{
{
    imglist = document.createElement("div");
    imglist.id = "imglist";

    // add thumbnails
    for(var i=0; i<len; ++i) {
        var imgpath = ls[i];
        var thumbpath = "thumbs/" + imgpath.replace(/^.*[\/\\]/,'').replace(/\.[^.]*$/,'.png');
        var imgname = "(" + (i+1) + ") " + imgpath;
        var imgitem = newItem(thumbpath, imgname);
        imglist.appendChild(imgitem);
    }

    b.appendChild(imglist);
    items = document.getElementsByClassName("imgitem");

    // moving selection cursor is faster than changing style of current item
    selection = document.createElement("div");
    selection.id = "selection";
    imglist.appendChild(selection);

    // select current
    selectItem(n-1);
    selection_needs_update = true;

    list_hidden = true;
    imglist.style.display = "none";
}//}}}

function onLoad()//{{{
{
    b = document.getElementsByTagName('body')[0];
    canvas = document.getElementById('canvas');

    // mousewheel on canvas/image
    document.onmousewheel = function (e) {
      var delta = e.wheelDelta/3;
      window.scroll(window.pageXOffset,window.pageYOffset-delta);
      e.stop();
      if ( window.pageYOffset == 0 )
        popInfo();
    };
    
    document.body.style.overflow = 'hidden';

    showImageInfo();
    showImage();

    initDragScroll();

    createList();
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

var len = ls.length;

// GET variables
var vars = getUrlVars();

// page number
var n = getPage( parseInt(vars["n"]) );

// image filename and path
var imgname = ls[n-1];
var imgpath = encodeURIComponent(imgname);

// zoom
var zoom_step   = 0.125;
var zoom_state  = vars["zoom"];
var zoom_factor;
if ( zoom_state != "fit" && zoom_state != "fill") {
	zoom_factor = parseFloat(zoom_state);
	if (!zoom_factor)
		zoom_factor = 1.0;
}

// image width and height
var w, h;

// title
if( !title )
    var title = "untitled";
// title format: GALLERY_NAME: n/N "image.png"
document.write('<title>' + title + ": " + n + "/" + len + ' "' + imgname + '"</title>');

// handle keydown
document.addEventListener("keydown", keyDown, false);

var b, canvas, img, preload_imgs;
var imglist, items, selection, selected;
var selection_needs_update = true;
var info_hidden = true;
var list_hidden;
var lastpos = [0,0];

