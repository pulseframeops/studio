// Local platform assets. No external fetch is performed by the renderer.
(function(){
 const logos={};
 const ids={spotify:'spotify.png',youtubeMusic:'youtube-music.png',appleMusic:'apple-music.png',vkMusic:'vk-music.png',yandexMusic:'yandex-music.png'};
 for(const [id,file] of Object.entries(ids)){const img=new Image();const path='assets/platforms/'+file;img.src=window.PFEmbeddedAssets?.[path]||path;logos[id]=img;}
 window.PFPlatformLogos=logos;
})();
