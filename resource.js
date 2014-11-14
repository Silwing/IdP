var http = require("http"),
	url = require("url"),
	qs = require("querystring"),
	authzServer = { hostname: "localhost", 
	                port: 8889,
	                paths: {
	                	verify: "/verify"
	                }},
	users = [
	    {userid: 1, name: "Test User 1"},
	    {userid: 2, name: "Test User 2"}
	];

(function start(){

	function info(request, response, urlObj) {
		var accessToken = urlObj.query.accessToken;
		var authOptions = { hostname: authzServer.hostname,
			                port: authzServer.port,
			                path: authzServer.paths.verify + "?" +
			                    qs.stringify({accessToken: accessToken})
		                  }
		var authReq = http.get(authOptions, function(authResp) {
        	if(authResp.statusCode == 200) {
        		authResp.setEncoding("utf8");
        		var jsonData = "";
        		authResp.on("data", function(chunk) {
        			jsonData += chunk;
        		})
        		.on("end", function() {
        			var dataObj = JSON.parse(jsonData);
        			for(var i = 0; i < users.length; i++) {
        				if(dataObj.userid == users[i].userid) {
        					response.writeHead(200, {"Content-Type": "application/json"});
        					response.write(JSON.stringify({name: users[i].name}));
        					response.end();
        				}
        			}
        			response.writeHead(404, {"Content-Type": "application/json"});
        			response.write(JSON.stringify({error: "Could not find any user data"}));
        			response.end();
        		});
        	} else if(authResp.statusCode == 400) {
        		authResp.setEncoding("utf8");
        		var jsonData = "";
        		authResp.on("data", function(chunk) {
        			jsonData += chunk;
        		})
        		.on("end", function() {
        			var dataObj = JSON.parse(jsonData);
        			response.writeHead(400, {"Content-Type": "application/json"});
        			response.write(JSON.stringify({error: "Access token not valid"}));
        			response.end();
        		})
        	}
        });
	}

	function onRequest(request, response) {
		var urlObj = url.parse(request.url);

		switch(urlObj.pathname) {
			case "/info":
			    info(request, response, urlObj);
			break;
			default:
			    response.writeHead(404, {"Content-Type": "text/plain"});
			    response.write("We did not find what you were looking for :(");
			    response.end();
			break;
		}
	}

	http.createServer(onRequest).listen(8890);
})();