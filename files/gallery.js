/*
 * HTML document should include:
 *   - <script type="text/javascript" src="files/gallery.js"></script>
 *   - <body onload="onLoad()">
 *   - <canvas id="canvas></canvas>
 *   - form:
 *   <form name="navigation" method="get">
 *     <input type="hidden" name="zoom" value="1" />
 *     <input type="hidden" name="brightness" value="0" />
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
    //brightness();

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
    if ( list_hidden ) {
        imglist.style.display = "";
        lastpos = [window.pageXOffset,window.pageYOffset];
        window.scrollTo(0,getTop(document.getElementById("selected")));
    }
    else {
        imglist.style.display = "none";
        window.scrollTo(lastpos[0],lastpos[1]);
    }
    list_hidden = !list_hidden;
}//}}}

function listMove(x,y)//{{{
{
    var newsel;
    var sel = document.getElementById('selected');
    var xx = getLeft(sel)-window.pageXOffset+sel.offsetWidth/2;
    var yy = getTop(sel)-window.pageYOffset+sel.offsetHeight/2;

    // find next list item
    while(true) {
        if (x) {
            xx+=x;
            if (xx < 0) {
                window.scrollBy(xx,0);
                xx = 0;
                if (window.pageXOffset == 0)
                    return;
            }
            else if (xx >= window.innerWidth) {
                var d = window.pageXOffset;
                window.scrollBy(x,0);
                if ( d == window.pageXOffset )
                    return;
                xx-=x;
            }
        }
        else if (y) {
            yy+=y;
            if (yy < 0) {
                window.scrollBy(0,yy);
                yy = 0;
                if (window.pageYOffset == 0)
                    return;
            }
            else if (yy >= window.innerHeight) {
                var d = window.pageYOffset;
                window.scrollBy(0,y);
                if ( d == window.pageYOffset )
                    return;
                yy-=y;
            }
        }
        else
            break;
        newsel = document.elementFromPoint(xx, yy);
        if (newsel && newsel.className == "imgitem" && newsel.id != "selected")
            break;
    }

    if (newsel && newsel.className == "imgitem") {
        sel.id = "";
        newsel.id = "selected";
        
        // scroll to selected
        xx = getLeft(newsel);
        yy = getTop(newsel);
        var d = yy + newsel.offsetHeight - window.pageYOffset - window.innerHeight ;
        if ( d > 0 )
            window.scrollBy(0,d);
        if ( yy < window.pageYOffset )
            window.scrollTo(window.pageXOffset,yy);
    }
}//}}}

function listUp()//{{{
{
    listMove(0,-5);
}//}}}

function listDown()//{{{
{
    listMove(0,5);
}//}}}

function listRight()//{{{
{
    listMove(5,0);
}//}}}

function listLeft()//{{{
{
    listMove(-5,0);
}//}}}

function keyDown(e)//{{{
{
	var keycode = e.which;
	var keyname;

	switch ( keycode ) {
    case 13:
        keyname = "Enter";
        break;
    case 27:
        keyname = "Escape";
        break;
	case 37:
		keyname = "Left";
		break;
	case 38:
		keyname = "Up";
		break;
	case 39:
		keyname = "Right";
		break;
	case 40:
		keyname = "Down";
		break;
	case 33:
		keyname = "PageUp";
		break;
	case 34:
		keyname = "PageDown";
		break;
	case 35:
		keyname = "End";
		break;
	case 36:
		keyname = "Home";
		break;
	default:
		keyname = String.fromCharCode(keycode);
		break;
	}
    //alert(keycode +";"+ keyname);

	switch (keyname) {
    case "Enter":
        if ( !list_hidden ) {
            var sel = document.getElementById("selected");
            var num = sel.firstChild.data;
            var a = num.search(/\(/);
            var b = num.search(/\)/);
            go( num.substring(a+1, b-a) );
            //go(nn);
        }
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
            do {
                var sel = document.getElementById("selected");
                listDown(window.innerHeight);
            } while ( sel != document.getElementById("selected") );
        }
        break;
    case "Home":
        if ( list_hidden )
            window.scrollTo(0,0);
        else {
            do {
                var sel = document.getElementById("selected");
                listUp(window.innerHeight);
            } while ( sel != document.getElementById("selected") );
        }
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
	//case "J":
	//case "J":
        //brightness_factor += brightness_step;
        //brightness();
		//break;
	//case "K":
        //brightness_factor -= brightness_step;
        //brightness();
		//break;
	//case "L":
        //brightness_factor = 0;
        //brightness();
		//break;
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
    for(var i = 0; i<3; ++i)
        document.createElement('img').src = "imgs/" + encodeURIComponent(ls[n+i]);
}//}}}

function imgOnLoad()//{{{
{ 
	w = this.width;
    h = this.height;

	zoom();
    //brightness(brightness_factor);

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
		//document.navigation.brightness.value = brightness_factor;
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

function createList()//{{{
{
    imglist = document.createElement("div");
    imglist.id = "imglist";

    var l,thumb;
    for(var i=0; i<len; ++i) {
        var imgname = ls[i];
        l = document.createElement('div');
        l.className = "imgitem";
        l.onclick = function() { document.navigation.n.value = this.id; document.navigation.submit(); }
        l.appendChild( document.createTextNode("(" + (i+1) + ") " + imgname) );
        if (i == n-1)
            l.id = "selected";
        // thumbnail
        thumb = document.createElement('img');
        thumb.className = "thumbnail";
        thumb.src = "thumbs/" + imgname.replace(/^.*[\/\\]/,'').replace(/\.[^.]*$/,'.jpg');
        thumb.alt = "xxx";
        thumb.style.display = "none";
        // show thumbnail only if src exists
        thumb.onload = function() { this.style.display = ""; };
        l.appendChild(thumb);
        imglist.appendChild(l);
    }

    b.appendChild(imglist);
    Element.hide('imglist');
}//}}}

function onLoad()//{{{
{
    b = document.getElementsByTagName('body')[0];
    canvas = document.getElementById('canvas');
    //ctx = canvas.getContext('2d');

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

var len = ls.length;

// GET variables
var vars = getUrlVars();
// page number
var n = getPage( parseInt(vars["n"]) );
// image filename and path
var imgname = ls[n-1];
var imgpath = encodeURIComponent(imgname);
// zoom
var zoom_step   = 0.25;
var zoom_state  = vars["zoom"];
var zoom_factor;
if ( zoom_state != "fit" && zoom_state != "fill") {
	zoom_factor = parseFloat(zoom_state);
	if (!zoom_factor)
		zoom_factor = 1.0;
}
//var brightness_step   = 0.05;
//var brightness_factor  = parseFloat(vars["brightness"]||"0");

// image width and height
var w, h;

// title
document.write('<title>'+imgname+'</title>');

// handle keydown
document.addEventListener("keydown", keyDown, false);

// html elements:
//  body, canvas, canvas context, image
var b, canvas, ctx, img, imglist;
var info_hidden = true;
var list_hidden = true;
var lastpos;

