const { REFRESH_INTERVAL_MS } = require("./config");

const scrollScript = `
(function() {
    
  var browser = window,
      doc = browser.document;

  // If there's a hash, or addEventListener is undefined, stop here
  if ( !location.hash || !browser.addEventListener ) {

    //set to 1
    window.scrollTo( 0, 1 );
    var scrollTop = 1,

    //reset to 0 if needed
    checkWindowBody = setInterval(function(){
      if( doc.body ){
        clearInterval( checkWindowBody );
        scrollTop = "scrollTop" in doc.body ? doc.body.scrollTop : 1;
        browser.scrollTo( 0, scrollTop === 1 ? 0 : 1 );
      } 
    }, 15 );

    if (browser.addEventListener) {
      browser.addEventListener("load", function(){
        setTimeout(function(){
          //reset to hide address
          browser.scrollTo( 0, scrollTop === 1 ? 0 : 1 );
        }, 0);
      }, false );
    }
  }

})();`;

const index = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>SL Hökis</title>
      
    </head>
    <body style="font-size: 65px">
      <div id="content" style="margin-bottom: 3rem"></div>
      <pre id="error" style="color: orange; font-size: 0.4em"></div>
      <script>
        let errorCount = 0;
        let errorSince = null;
        function loadContent() { 
          fetch('/content')
            .then(function (response) { 
              return response.text();
            })
            .then(function (html) {
              errorCount = 0;
              errorSince = null;
              document.getElementById('content').innerHTML = html;
              document.getElementById('error').innerHTML = '';
            })
            .catch(function (err) {
              if (errorCount === 0) errorSince = new Date();
              errorCount++;
              document.getElementById('error').innerHTML = '<pre>(' + errorCount + ') ' + err.message + '<br/>' + errorSince.toTimeString() + '</pre>';
            })
        }
        setInterval(loadContent, ${REFRESH_INTERVAL_MS});
        loadContent(); 
        
      </script>
    </body>
  </html>
  `;

module.exports = index;
