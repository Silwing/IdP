var http = require("http"),
	url = require("url"),
	qs = require("querystring"),
	clientSeverName = "localhost",
	clientSeverPort = "8888",
	clientSever = "http://" + clientSeverName + ":" + clientSeverPort + "/",
	users = [{username: "user1",password: "1234"},{username: "user2", password: "4321"}],
	clients = [{cid: "cid123456", code: "ac123", token: "at42"}];


(function start() {

	
	function onRequest(request, response) {
		var urlObj = url.parse(request.url, true);
		
		switch (urlObj.pathname) {
			case "/login":
				login(request,response,urlObj);
				break;
			case "/authenticate":
				authenticate(request,response,urlObj);			
				break;
			case "/access":
				access(request,response,urlObj);			
				break;
			case "/verify":
				verify(request,response,urlObj);				
				break;
			default:
				console.log(request.url);
				error(response,"We could not find anything matching your request... :'(");
		}
	}
	
	/*
	*	Handle login request (3/4)
	*	Get login request from client through the browser and send request to user/browser
	*/
	function login(request,response,urlObj) {
		var clientid = urlObj.query.clientId;
		var responsetype = urlObj.query.responseType;
		var returnurl = urlObj.query.returnurl;
			
		if(responsetype != "code"){
			error(response,"The response type must be 'code'");
		}
			
		if(!checkClientId(response, clientid)) {
			return;
		}
			
		//todo: returner login side til browser
		userLogin(request,response,urlObj);
	}
	
	function userLogin(request,response,urlObj){
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write("<!DOCTYPE html>");
		response.write("<html>");
		response.write("<head>");
		response.write("<title>Login</title>");
		response.write("</head>");
		response.write("<body>");
		
		response.write("<h1>Please login</h1>");
				
		response.write("</body>");
		response.write("</html>");
		response.end();
	}
	
	/*
	*	Handle authentication of user (7/9)
	*	Get info from user and send to client through the browser
	*/
	function authenticate(request,response,urlObj) {	
		var username = urlObj.query.username;
		var password = urlObj.query.password;
		var clientid = urlObj.query.clientId;
		var returnurl = urlObj.query.returnUrl;
		var valid = false;

		for(i = 0; i < users.length; i++){
			if(username == users[i].username && password == users[i].password){
				valid = true;
				break;
			}
		}
					
		if(valid){
			for(i = 0; i < clients.length; i++){
				if(clientid == clients[i].cid){
					response.writeHead(303, {"Location": returnUrl + "?" + qs.stringify({authzCode: clients[i].code})});
					response.end();
					return;
				}
			}
			error(response, "Invalid client ID");
		} else {
			error(response,"Wrong username or password");			
		}
	}
	
	/*
	*	Handle access request from client (10/12)
	*	Communicate directly with client
	*/
	function access(request,response,urlObj) {
		var clientid = urlObj.query.clientId;
		var acode = urlObj.query.authzCode;
		
		for(i = 0; i < clients.length; i++){
			if(clientid == clients[i].cid && acode == clients[i].code){
				response.writeHead(200, {"Content-Type": "application/json"});
				response.write(JSON.stringify({accessToken: clients[i].token, tokenType: "bearer"}));
				response.end();
				return;
			}
		}
		error(response,JSON.stringify({error: "ClientId or authorization code not valid"}));		
	}
	
	/*
	*	Handle verification of access (17) 
	* 	Communicate with the resource server
	*/
	function verify(request,response,urlObj) {
		var token = urlObj.query.accessToken;
		var valid = false;
		
		if(accesstokens.length > 0){
			for(i = 0; i < accesstokens.length; i++){
				if(token == accesstokens[i]){
					valid = true;
					break;
				}
			}
		}
		
		if(valid){
			// todo: Returnerer valid eller invalid
			response.writeHead(200, {"Content-Type": "text/html"});
			response.write("verify");
			response.write(" valid accesstoken");
			response.end();
		} else{
			// error
			error(response,"Not a valid access token");
		}
		
	}
	
	
	function checkClientId(response, clientid) {
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].cid == clientid)
				return true;
		}
		error(response, "Client with id " + clientid + " is not a registered client");
		return false;
	}
	
	function error(response, msg) {
		response.writeHead(400, {"Content-Type": "text/plain"});
		response.write(msg);
		response.end();
		return;
	}
	
	http.createServer(onRequest).listen(8889);

})();