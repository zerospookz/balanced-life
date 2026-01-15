
/* Balanced Life v6.1 – Auto sky theme by hour */
(function(){
  function applySkyTheme(){
    const h = new Date().getHours();
    const root = document.documentElement;
    if(h >= 6 && h < 10){
      root.setAttribute("data-sky","sunrise");
    }else if(h >= 10 && h < 18){
      root.setAttribute("data-sky","day");
    }else{
      root.setAttribute("data-sky","night");
    }
  }
  applySkyTheme();
  setInterval(applySkyTheme, 60000);
})();
