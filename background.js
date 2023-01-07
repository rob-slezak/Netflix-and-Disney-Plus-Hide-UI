const APPLICABLE_PROTOCOLS = ["http:", "https:"];
const PAGE = { UNKNOWN: 0, NETFLIX: 'Netflix', DISNEY: 'Disney' };
let enabled = {};

/*
Get Theme: determines whether to use a light or dark theme
*/
async function getTheme() {	
	let theme = 'light';

	const browserTheme = await (browser.theme.getCurrent());
	if (browserTheme && browserTheme.colors && browserTheme.colors.toolbar_field) {
		let rgb = browserTheme.colors.toolbar_field.split(',');
		let r = parseInt(rgb[0].substring(4));
		let g = parseInt(rgb[1]);
		let b = parseInt(rgb[2]);
		let avg = (r + g + b) / 3;
		let percent = avg / 255;

		if (percent < 0.5) {
			theme = 'dark';
		}
	}

	return theme;
}

/*
Toggle CSS: insert or remove the CSS.
Update the page action's title and icon to reflect its state.
*/
function enableCSS(tab, page) {
	getTheme().then((theme) => {
		browser.pageAction.setIcon({ tabId: tab.id, path: `icons/${page}-on-${theme}.png` });
		browser.pageAction.setTitle({ tabId: tab.id, title: `Show ${page} UI` });
		browser.tabs.insertCSS({ file: `${page}.css` });
		enabled[tab.id] = true;
	});
}

function disableCSS(tab, page) {
	getTheme().then((theme) => {
		browser.pageAction.setIcon({ tabId: tab.id, path: `icons/${page}-off-${theme}.png` });
		browser.pageAction.setTitle({ tabId: tab.id, title: `Hide ${page} UI` });
		browser.tabs.removeCSS({ file: `${page}.css` });
		delete enabled[tab.id];
	});
}

function toggleCSS(tab) {
	const page = urlMatch(tab.url);
	if (tab.id in enabled) {
		disableCSS(tab, page);
	} 
	else {
		enableCSS(tab, page);
	}
}

/*
Returns true only if the URL's protocol is in APPLICABLE_PROTOCOLS.
Argument url must be a valid URL string.
*/
function protocolIsApplicable(url) {
	const protocol = (new URL(url)).protocol;
	return APPLICABLE_PROTOCOLS.includes(protocol);
}

function urlMatch(url) {
	if (/^https?:\/\/www\.netflix\.com\/?.*/.test(url)) {
		return PAGE.NETFLIX;
	}
	if (/^https?:\/\/www\.disneyplus\.com\/?.*/.test(url)) {
		return PAGE.DISNEY;
	}
	return PAGE.UNKNOWN;
}

/*
Initialize the page action: set icon and title, then show.
Only operates on tabs whose URL's protocol is applicable and url is Netflix or Disney.
*/
function initializePageAction(tab) {
	const page = urlMatch(tab.url);
	if (protocolIsApplicable(tab.url) && page != PAGE.UNKNOWN) {
		if (enabled[tab.id]) {
			enableCSS(tab, page);
		} 
		else {
			disableCSS(tab, page);
		}

		browser.pageAction.show(tab.id);
	}
}

/*
When first loaded, initialize the page action for all tabs.
*/
var gettingAllTabs = browser.tabs.query({});
gettingAllTabs.then((tabs) => {
	for (let tab of tabs) {
		initializePageAction(tab);
	}
});

/*
Each time a tab is updated, reset the page action for that tab.
*/
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	// Resets the tab's status on a page refresh
	if (changeInfo.status == "loading") {
		delete enabled[tabId];
	}

	initializePageAction(tab);
});

/*
Toggle CSS when the page action is clicked.
*/
browser.pageAction.onClicked.addListener(toggleCSS);
