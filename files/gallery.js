// HTML document should include:
//   - <script type="text/javascript" src="files/gallery.js"></script>
//   - <body onload="onLoad()">
//   - <canvas id="canvas></canvas>
//   - form:
//   <form name="navigation" method="get">
//     <input type="hidden" name="zoom" value="1" />
//     <input type="hidden" name="brightness" value="0" />
//     <input type="hidden" name="n" value="0" />
//   </form>

function zoom(){//{{{
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
    canvas.width = nw;
    canvas.height = nh;
    brightness();

    // center image in window
    newtop = (wh-nh)/2;
    canvas.style.top = newtop > 0 ? newtop : 0;
}//}}}

function brightness(){//{{{
    // Chromium BUG(?):
    //   function ctx.getImageData doesn't work
    cw = canvas.width;
    ch = canvas.height;

    //if ( brightness_factor > 0 )
        //ctx.fillStyle = "rgba(255,255,255,"+brightness_factor+")";
    //else
        //ctx.fillStyle = "rgba(0,0,0,"+(-brightness_factor)+")";

    //ctx.globalCompositeOperatron = "copy";
    ctx.drawImage(img,0,0,cw,ch);
    //ctx.globalCompositeOperation = "source-atop";
    //ctx.fillRect(0,0,cw,ch);
}//}}}

function keyDown(e){//{{{
	var keycode = e.which;
	var keyname;

	switch ( keycode ) {
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
	default:
		keyname = String.fromCharCode(keycode);
		break;
	}

	switch (keyname) {
	case "Left":
        if ( canvas.width <= window.innerWidth )
		    go(n-1);
        else
            window.scrollBy(-window.innerWidth/4,0);
		break;
	case "Up":
		window.scrollBy(0,-window.innerHeight/4);
		break;
	case "Right":
        if ( canvas.width <= window.innerWidth )
		    go(n+1);
        else
		    window.scrollBy(window.innerWidth/4,0);
		break;
	case "Down":
		window.scrollBy(0,window.innerHeight/4);
		break;
	case "PageUp":
		window.scrollBy(0,-window.innerHeight);
		break;
	case "PageDown":
		window.scrollBy(0,window.innerHeight);
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
	case "J":
        brightness_factor += brightness_step;
        brightness();
		break;
	case "K":
        brightness_factor -= brightness_step;
        brightness();
		break;
	case "L":
        brightness_factor = 0;
        brightness();
		break;
	}
}//}}}

function initDragScroll() {//{{{
    var x,y;

    document.addEventListener("mousedown",startDragScroll,false);
    document.addEventListener("mouseup",stopDragScroll,false);
    document.addEventListener("mousemove",dragScroll,false);

    function startDragScroll(e){
        if (e.button == 0 && e.target.id == "canvas") {
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
        }
    }
}//}}}

function getUrlVars() {//{{{
	var map = {};
	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
		map[key] = value;
	});
	return map;
}//}}}

function imgOnLoad() {//{{{
	w = this.width;
    h = this.height;

	zoom();
    brightness(brightness_factor);

	window.setTimeout("Effect.Fade('resolution',{duration:1});window.setTimeout(\"Element.hide('resolution');document.getElementById('resolution').innerText = w+'x'+h; Effect.Appear('resolution', {duration:0.5});\",1000);",20);
}//}}}

function getPage(i) {//{{{
	if (!i || i<1)
		return 1;
	else if (i > len)
		return len;
	else 
		return i;
}//}}}

function go(i) {//{{{
	var pg = getPage(i);
	if ( pg != n ) {
		Effect.Squish('info',{duration:5});
		document.navigation.n.value = pg;
		document.navigation.zoom.value = (zoom_state) ? zoom_state : zoom_factor;
		document.navigation.brightness.value = brightness_factor;
		document.navigation.submit();
	}
}//}}}

function showImageInfo() {//{{{
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
	l.href = "imgs/" + imgpath;
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

function showImage() {//{{{
    img = document.createElement('img');
    img.src = "imgs/" + imgpath;
    img.id = "myimage";
    img.name = "myimage";
    img.onload = imgOnLoad;
}//}}}

function onLoad() {//{{{
    b = document.getElementsByTagName('body')[0];
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // mousewheel on canvas/image
    canvas.onmousewheel = function (e) {
      var delta = e.wheelDelta/5;
      window.scroll(window.pageXOffset,window.pageYOffset-delta);
      e.stop();
    };
    
    document.body.style.overflow = 'hidden';

    showImageInfo();
    showImage();

    initDragScroll();

    // selection box {{{
    var imglist = document.createElement("div");
    imglist.id = "imglist";

    var from = n-6;
    if (from <= 0)
        from = 0;
    else
        imglist.appendChild(document.createTextNode("..."));
    var l;
    for(var i=from; i<len; ++i) {
        var imgname = ls[i];
        if (i != n-1) {
            l = document.createElement('div');
            l.className = "imgitem";
            l.id = i+1;
            l.onclick = function() { document.navigation.n.value = this.id; document.navigation.submit(); }
            l.appendChild( document.createTextNode(imgname) );
        }
        else {
            l = document.createElement('div');
            l.id = "default";
            l.appendChild( document.createTextNode(imgname) );
        }
        imglist.appendChild(l);
    }

    b.appendChild(imglist);
    //}}}
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
var brightness_step   = 0.05;
var brightness_factor  = parseFloat(vars["brightness"]||"0");

// image width and height
var w, h;

// title
document.write('<title>'+imgname+'</title>');

// handle keydown
document.addEventListener("keydown", keyDown, false);

// html elements:
//  body, canvas, canvas context, image
var b, canvas, ctx, img;

