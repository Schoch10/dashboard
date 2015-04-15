weatherConditions = new Mongo.Collection('currentweath');
Tweets = new Mongo.Collection('twitter');
StockQuotes = new Mongo.Collection('stocks');

if (Meteor.isClient) {
	Meteor.subscribe('currentWeather');
	Meteor.subscribe('tweets');
	Meteor.subscribe('stockQuotes');
	var extendedConditionsHidden;
	Template.currentWeather.helpers({
		dailyWeather: function() {
			return weatherConditions.findOne({}, {sort: {createdAt: -1 }});
		}
	}),

	Template.tweetDeck.helpers({
		liveTweets: function() {
			return Tweets.find({}, {limit: 10, sort: {inserted: -1 }});
		}
	}),

	Template.stockTemplate.helpers({
		stock: function() {
			return StockQuotes.find({}, {limit: 7, sort: {insertDate: -1}});
		}
	});

	Template.currentWeather.events({
		'click .currentWeatherContainer': function() {
			if (extendedConditionsHidden) {
        	 	$('.extendedConditions').show();
        	 	extendedConditionsHidden = false;
        	}
      		else {
      		 	$('.extendedConditions').hide();
      		 	extendedConditionsHidden = true;
      		}
		}
	})
}

if (Meteor.isServer) {

	Meteor.publish('currentWeather', function(){
		return weatherConditions.find();
	}); 

	Meteor.publish('tweets', function(){
		return Tweets.find();
	}); 

	Meteor.publish('stockQuotes', function() {
		return StockQuotes.find();
	});

	var currentUser = Meteor.users.findOne();
	var twitterAccessToken = currentUser.services.twitter.accessToken;
	var twitterAccessTokenSecret = currentUser.services.twitter.accessTokenSecret;

	var Twit = Meteor.npmRequire('twit');
	var T = new Twit({
    consumer_key: '7dDX9DgyOfwxKc7SeSlkM1pDi',
    consumer_secret: 'UJXCkeRs6ILO57hmYMBUx4UzGqMTzASQKDrh4P8s7WKNZ6QXqQ',
    access_token: twitterAccessToken,
    access_token_secret: twitterAccessTokenSecret
	});

	var stream = T.stream('user')

	stream.on('tweet', Meteor.bindEnvironment(function (tweet) {
  		Tweets.insert({
  			tweeter: tweet.user.name,
  			tweet: tweet.text,
  			tweeterImage: tweet.user.profile_image_url,
  			inserted: new Date()
  		});
	}), function(e) {
		console.log('bind failure')
	});

	var stockQuotesURL = 'https://finance.yahoo.com/webservice/v1/symbols/aapl,f,gis,ogs,fb,wmt,dnkn,ppl/quote?format=json';

	Meteor.http.get(stockQuotesURL, function(error, data) {
		if (error) {
			console.log('handle error');
		} else {
			console.log(data); 
			var stockQuotesJSON = JSON.parse(data.content);
			console.log(stockQuotesJSON.list.resources[0].resource.fields);
			for (i = 0; i < stockQuotesJSON.list.resources.length - 1; i++) {
				StockQuotes.insert({
					companyName: stockQuotesJSON.list.resources[i].resource.fields.name,
					stockPrice: stockQuotesJSON.list.resources[i].resource.fields.price,
					insertDate: new Date()
				});
			} 
		} 
	});


	Meteor.http.get('http://api.openweathermap.org/data/2.5/weather?q=boston,ma', function(error, data){

		if (error) {
			console.log("No Data");
		} else {
			var returnedData = data;
			console.log(returnedData.data.main);
			var temperature = returnedData.data.main.temp * 9/5 - 459.67;
			var lowTemp = returnedData.data.main.temp_min * 9/5 - 459.67;
			weatherConditions.insert({
					temp: temperature.toFixed(2),
				 	createdAt:  new Date(),
					conditions: returnedData.data.weather[0].main,
				 	conditionDescription: returnedData.data.weather[0].description,
				 	lowTemp: lowTemp.toFixed(2),
				 	windSpeed: returnedData.data.wind.speed
			});
		}
	});	
}
