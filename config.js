// user configuration (these can be overriden in URL)
config = {
'zoom_step': 0.125,

'progress_radius': 22,
'progress_width': 4,
'progress_inner_width': 4,
'progress_bg': "rgba(200,200,200,0.4)",
'progress_fg': "white",
'progress_blur': 10,

'font_size': 16,
'font_test': 'Click to edit!\n\nLorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.\n\nPříšerně žluťoučký kůň úpěl ďábelské ódy.\nPŘÍŠERNĚ ŽLUŤOUČKÝ KŮŇ ÚPĚL ĎÁBELSKÉ ÓDY\n\nint main(int argc, char* argv[]) {\n  printf( \"\%20s\",(argc>2) ? argv[1] : "hello" );\n  return 1234567890;\n}',

'thumbnail_font_test': "0123456789 .,:;?!=+-*/\\&@#$%<>()[]{} Příšerně žluťoučký kůň úpěl ďábelské ódy",

'autoplay': false,
'loop': false,
'autonext': false,

'pop_info_delay': 2000,
'pop_preview_delay': 2000,

// use canvas to draw images
'image_on_canvas': false,
}

// these can't be overriden in URL
_config = {
'preload_images': 3,
}
