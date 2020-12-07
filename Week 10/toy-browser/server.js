const http = require('http');

http.createServer((request, response) => {
  let body = [];
  request.on('error', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    body.push(chunk.toString());
  }).on('end', () => {
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(`<html><head id="headid"><style> body .wrapper{background-color: gray}body div #box{width: 100px;height:100px;border:1px solid red;}</style></head> <body> <div class='wrapper'><div id='box'></div></div><img/></body></html>`);
  });
}).listen(8088, () => {
  console.log('Server started on port: 8088')
});