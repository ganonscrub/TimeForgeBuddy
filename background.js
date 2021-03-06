var URLs = {
	calendarList: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
	addEvent: 'https://www.googleapis.com/calendar/v3/calendars/{calendarID}/events/'
};

function addEvent( queryData ){
	chrome.storage.local.get( 'calendar', ( item ) => {
		if ( item.calendar ){
			chrome.identity.getAuthToken( { 'interactive': true }, (token) => {
				$.ajax({
					url: URLs.addEvent.replace( "{calendarID}", item.calendar.id ),
					type: 'POST',
					data: queryData,
					contentType: 'application/json; charset=utf-8',
					dataType: 'json',
					headers: { 'Authorization': 'Bearer ' + token },
					success: ( response ) => {
						chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
							chrome.tabs.sendMessage(tabs[0].id, { success: true }, (response) => {
								//console.log(response.farewell);
							});
						});
					},
					error: ( response ) => { console.log( 'error:', response ); }
				});
			});
		}
		else{
			chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
				chrome.tabs.sendMessage(tabs[0].id, { error: 'calendar not set' }, (response) => {
					//console.log(response.farewell);
				});
			});
			console.error( 'Could not get calendar' );
		}
	});
}

function getCalendarEvents(){
	chrome.storage.local.get( 'calendar', ( item ) => {
		if ( item.calendar ){
			var eventsURL = 'https://www.googleapis.com/calendar/v3/calendars/' + item.calendar.id + '/events?';
			
			var min = new Date();
			min.setDate( min.getDate() - 30 );
			var max = new Date();
			max.setDate( max.getDate() + 30 );

			eventsURL += 'timeMin=' + min.toISOString() + '&';
			eventsURL += 'timeMax=' + max.toISOString() + '&';
			eventsURL += 'timeZone=America/New_York';
			
			console.log( 'Running thing...' );
			
			chrome.identity.getAuthToken( { 'interactive': true }, (token) => {
				$.ajax({
					url: eventsURL,
					type: 'GET',
					headers: { 'Authorization': 'Bearer ' + token },
					success: ( resp ) => {
						var startEnds = [];
						for ( i of resp.items ){
							if ( i.status == 'cancelled' )
								console.info( 'Ignoring cancelled event:', i );
							else
								startEnds.push( { start: i.start.dateTime, end: i.end.dateTime } );
						}
						var cur = new Date();
						chrome.storage.local.set( { events: { calendar: item.calendar.id, items: startEnds, updated: cur.toISOString() } } );
					}
				});
			});
		}
	});
}

function openOptionsTab(){
	chrome.tabs.create( { url: 'options.html' } );
}

function openHRTab(){
	var hrURL = 'https://sm-prd.hcm.umasscs.net/psp/hrprd92/EMPLOYEE/HRMS/c/ROLE_EMPLOYEE.TL_MSS_EE_SRCH_PRD.GBL';
	
	chrome.tabs.create( { url: hrURL }, tab=>{} );
}

chrome.runtime.onMessage.addListener(
	( request, sender, sendResponse ) => {
		//console.log( request );
		switch ( request.type ){
			case 'addEvent':
				if ( request.data ){
					addEvent( request.data );
					sendResponse( { type: request.type } );
				}
				else
					sendResponse( { type: request.type, error: 'No data property supplied in request' } );
				break;
				
			case 'openOptionsTab':
				openOptionsTab();
				break;
				
			case 'openHRTab':
				openHRTab();
				break;
				
			case 'getCalendarEvents':
				getCalendarEvents();
				sendResponse( { type: request.type, message: 'Attempted to get events' } );
				break;
				
			default:
				sendResponse( { type: request.type, error: 'Unhandled request type given' } );
		}
	}
);