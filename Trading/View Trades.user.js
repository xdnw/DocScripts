// ==UserScript==
// @name         Doc: View Trades
// @namespace    https://politicsandwar.com/nation/id=19818
// @version      5.6
// @description  Make Trading on the market Better!
// @author       BlackAsLight
// @match        https://politicsandwar.com/index.php?id=26*
// @match        https://politicsandwar.com/index.php?id=90*
// @match        https://politicsandwar.com/nation/trade/*
// @icon         https://avatars.githubusercontent.com/u/44320105
// @grant        none
// ==/UserScript==

'use strict';
/* Double Injection Protection
-------------------------*/
if (document.querySelector('#Doc_ViewTrades'))
	return;
document.body.append(CreateElement('div', divTag => {
	divTag.id = 'Doc_ViewTrades';
	divTag.style.display = 'none';
}));

/* Global Variables
-------------------------*/
const nationLink = Array.from(document.querySelectorAll('a')).filter(x => x.textContent == 'View')[0].href;

const resources = (() => {
	const resources = ReplaceAll(document.querySelector('#rssBar').children[0].children[0].children[0].textContent.trim().replaceAll('\n', ''), '  ', ' ').replaceAll(',', '').split(' ');
	return {
		Money: parseFloat(resources[13]) - MinAmount('Money'),
		Oil: parseFloat(resources[2]) - MinAmount('Oil'),
		Coal: parseFloat(resources[1]) - MinAmount('Coal'),
		Iron: parseFloat(resources[5]) - MinAmount('Iron'),
		Bauxite: parseFloat(resources[6]) - MinAmount('Bauxite'),
		Lead: parseFloat(resources[4]) - MinAmount('Lead'),
		Uranium: parseFloat(resources[3]) - MinAmount('Uranium'),
		Food: parseFloat(resources[11]) - MinAmount('Food'),
		Gasoline: parseFloat(resources[7]) - MinAmount('Gasoline'),
		Steel: parseFloat(resources[9]) - MinAmount('Steel'),
		Aluminum: parseFloat(resources[10]) - MinAmount('Aluminum'),
		Munitions: parseFloat(resources[8]) - MinAmount('Munitions'),
		Credits: parseFloat(resources[0]) - MinAmount('Credits')
	};
})();

const currentResource = (() => {
	let args = location.search.slice(1).split('&');
	while (args.length) {
		const arg = args.shift().split('=');
		if (arg[0] == 'resource1') {
			if (arg[1].length) {
				return arg[1][0].toUpperCase() + arg[1].slice(1).toLowerCase();
			}
			break;
		}
	}
	return 'Money';
})();

// NegOne = None
// Zero = Personal
// One = Alliance
// Two = World
const marketType = (() => {
	if (location.pathname.startsWith('/nation/trade/')) {
		if (location.pathname.endsWith('world')) {
			return 2;
		}
		if (location.pathname.endsWith('alliance')) {
			return 1;
		}
		if (location.pathname == '/nation/trade/') {
			return 0;
		}
		return -1;
	}
	let args = location.search.slice(1).split('&');
	while (args.length) {
		const arg = args.shift().split('=');
		if (arg[0] == 'display') {
			if (arg[1] == 'world') {
				return 2;
			}
			if (arg[1] == 'alliance') {
				return 1;
			}
			return 0;
		}
	}
	return 0;
})();

let myOffers = {
	'Money': 0
};

/* User Configuration Settings
-------------------------*/
document.querySelector('#leftcolumn').append(CreateElement('div', divTag => {
	divTag.classList.add('Doc_Config');
	divTag.append(document.createElement('hr'));
	divTag.append(CreateElement('b', bTag => bTag.append('View Trades Config')));
	divTag.append(document.createElement('br'));
	divTag.append('Infinite Scroll: ');
	divTag.append(CreateElement('input', inputTag => {
		inputTag.type = 'checkbox';
		inputTag.checked = localStorage.getItem('Doc_VT_InfiniteScroll') != undefined;
		inputTag.onchange = () => {
			if (inputTag.checked) {
				localStorage.setItem('Doc_VT_InfiniteScroll', true);
			}
			else {
				localStorage.removeItem('Doc_VT_InfiniteScroll');
			}
			location.reload();
		};
	}));
	divTag.append(document.createElement('br'));
	divTag.append('Zero Accountability: ');
	divTag.append(CreateElement('input', inputTag => {
		inputTag.type = 'checkbox';
		inputTag.checked = localStorage.getItem('Doc_VT_ZeroAccountability') != undefined;
		inputTag.onchange = () => {
			if (inputTag.checked) {
				localStorage.setItem('Doc_VT_ZeroAccountability', true);
			}
			else {
				localStorage.removeItem('Doc_VT_ZeroAccountability');
			}
			UpdateLinks();
		};
	}));
	if (currentResource != 'Money') {
		divTag.append(document.createElement('br'));
		divTag.append(CreateElement('button', buttonTag => {
			buttonTag.append(`Max ${currentResource}`);
			buttonTag.onclick = () => {
				const key = `Doc_MaxResource_${currentResource}`;
				const currentMax = parseFloat(localStorage.getItem(key)) || 0;
				const newMax = parseInt(prompt(`Set the maximum amount of ${currentResource} that you would like to be set when creating an offer:`, currentMax)).toString();
				if (newMax != 'NaN' && newMax != currentMax) {
					if (newMax > 0) {
						localStorage.setItem(key, newMax);
					}
					else if (currentMax > 0) {
						localStorage.removeItem(key);
					}
					UpdateLinks();
				}
			};
		}));
	}
	divTag.append(document.createElement('br'));
	divTag.append(CreateElement('button', buttonTag => {
		buttonTag.append(`Min ${currentResource}`);
		buttonTag.onclick = () => {
			const currentMin = MinAmount(currentResource);
			const newMin = (Math.round(parseFloat(prompt(`Set the minimum amount of ${currentResource} that you would not like to sell:`, currentMin)) * 100) / 100).toString();
			if (newMin != 'NaN' && newMin != currentMin) {
				const key = `Doc_MinResource_${currentResource}`;
				if (newMin > 0) {
					localStorage.setItem(key, newMin);
					location.reload();
				}
				else if (currentMin > 0) {
					localStorage.removeItem(key);
					location.reload();
				}
			}
		};
	}));
}));

/* Functions
-------------------------*/
function CreateElement(type, func) {
	const tag = document.createElement(type);
	func(tag);
	return tag;
}

function ReplaceAll(text, search, replace) {
	if (search == replace || replace.search(search) != -1) {
		throw 'Infinite Loop!';
	}
	while (text.indexOf(search) != -1) {
		text = text.replaceAll(search, replace);
	}
	return text;
}

function MinAmount(resource) {
	const amount = parseFloat(localStorage.getItem(`Doc_MinResource_${resource}`));
	if (amount) {
		return amount;
	}
	return 0;
}

function ConvertRow(tdTags) {
	const resource = tdTags[4].children[0].getAttribute('title');
	if (myOffers[resource] === undefined) {
		myOffers[resource] = 0;
	}
	const quantity = parseInt(tdTags[4].textContent.trim().replaceAll(',', ''));
	const price = parseInt(tdTags[5].textContent.trim().split(' ')[0].replaceAll(',', ''));
	const sellerWanted = tdTags[1].childElementCount === 1;
	const buyerWanted = tdTags[2].childElementCount === 1;
	const offerType = (() => {
		switch (tdTags[6].children[0].tagName) {
			case 'FORM':
				return sellerWanted || buyerWanted ? 'Open' : 'rPersonal';
			case 'A':
				return sellerWanted || buyerWanted ? 'Personal' : 'sPersonal';
			default:
				if (tdTags[6].childElementCount > 1) {
					return 'Accepted';
				}
				return 'Embargo';
		}
	})();
	const amount = (() => {
		if (offerType === 'Open' || offerType === 'Personal') {
			return sellerWanted ? Math.max(Math.min(Math.floor(resources[resource]), quantity), 0) : Math.max(Math.floor(Math.min(resources.Money, quantity * price) / price), 0);
		}
		if (offerType === 'rPersonal') {
			return tdTags[2].children[0].href === nationLink ? Math.max(Math.min(Math.floor(resources[resource]), quantity), 0) : Math.max(Math.floor(Math.min(resources.Money, quantity * price) / price), 0);
		}
		return -1;
	})();
	document.querySelector('#Offers').append(CreateElement('div', divTag => {
		divTag.classList.add('Offer');
		if (offerType === 'Open' || offerType === 'Personal' || offerType === 'Embargo') {
			divTag.classList.add(`${sellerWanted ? 's' : 'b'}Offer`);
		}
		else {
			divTag.classList.add(`${tdTags[1].children[0].href === nationLink ? 's' : 'b'}Offer`);
		}

		// Nations
		divTag.append(CreateElement('div', divTag => {
			divTag.classList.add('Nations');
			divTag.style.gridArea = 'Nations';

			divTag.append(CreateElement('div', divTag => {
				divTag.style.gridArea = 'Left';
				GenerateNationInfo(offerType, divTag, tdTags[1], sellerWanted, 'SELLERS WANTED');
			}));
			divTag.append(CreateElement('div', divTag => {
				divTag.style.gridArea = 'Right';
				GenerateNationInfo(offerType, divTag, tdTags[2], buyerWanted, 'BUYERS WANTED');
			}));
		}));

		// Quantity
		divTag.append(CreateElement('div', divTag => {
			divTag.classList.add('Quantity');
			divTag.style.gridArea = 'Quantity';
			divTag.append(CreateElement('img', imgTag => {
				imgTag.src = tdTags[4].children[0].src;
			}));
			divTag.append(` ${quantity.toLocaleString()}`);
		}));

		// Price
		divTag.append(CreateElement('div', divTag => {
			divTag.classList.add('Price');
			divTag.style.gridArea = 'Price';
			divTag.append(`$${price.toLocaleString()}/Ton`);
			divTag.append(CreateElement('div', divTag => divTag.append(`$${(price * (amount === -1 ? quantity : amount)).toLocaleString()}`)));
		}));

		// Create
		divTag.append(CreateElement('div', divTag => {
			divTag.style.gridArea = 'Create';
			if (offerType === 'Personal') {
				divTag.append(CreateElement('a', aTag => {
					aTag.className = `${sellerWanted ? 's' : 'b'}TopUp_${resource}`;
					aTag.append('TopUp');
				}));
				if (sellerWanted) {
					myOffers.Money += price * quantity;
				}
				else {
					myOffers[resource] += quantity;
				}
				return;
			}
			divTag.append(CreateElement('a', aTag => {
				aTag.className = `${sellerWanted ? 's' : 'b'}Outbid_${resource}`;
				aTag.append('Outbid');
			}));
			divTag.append(document.createElement('br'));
			divTag.append(CreateElement('a', aTag => {
				aTag.className = `${sellerWanted ? 's' : 'b'}Match_${resource}`;
				aTag.append('Match');
			}));
		}));

		// Form
		divTag.append(CreateElement('div', divTag => {
			divTag.style.gridArea = 'Form';
			if (offerType === 'Open' || offerType === 'rPersonal') {
				divTag.append(CreateElement('form', formTag => {
					formTag.method = 'POST';
					formTag.append(CreateElement('input', inputTag => {
						inputTag.type = 'hidden';
						inputTag.name = 'tradeaccid';
						inputTag.value = tdTags[6].querySelector('input[name="tradeaccid"]').value;
					}));
					formTag.append(CreateElement('input', inputTag => {
						inputTag.type = 'hidden';
						inputTag.name = 'ver';
						inputTag.value = tdTags[6].querySelector('input[name="ver"]').value;
					}));
					formTag.append(CreateElement('input', inputTag => {
						inputTag.type = 'hidden';
						inputTag.name = 'token';
						inputTag.value = tdTags[6].querySelector('input[name="token"]').value;
					}));
					formTag.append(CreateElement('input', inputTag => {
						inputTag.classList.add('tradeForm');
						inputTag.type = 'number';
						inputTag.name = 'rcustomamount';
						inputTag.value = amount;
						inputTag.onchange = UpdateTotal;
					}));
					formTag.append(CreateElement('input', inputTag => {
						inputTag.classList.add('tradeForm');
						inputTag.type = 'submit';
						inputTag.name = 'acctrade';
						if (offerType === 'Open') {
							inputTag.classList.add(`${sellerWanted ? 's' : 'b'}Submit`);
							inputTag.value = sellerWanted ? 'Sell' : 'Buy';
							return;
						}
						inputTag.classList.add(`${tdTags[1].children[0].href === nationLink ? 's' : 'b'}Submit`);
						inputTag.value = tdTags[1].children[0].href === nationLink ? 'Sell' : 'Buy';
					}));
				}));
				if (offerType === 'rPersonal') {
					divTag.append(CreateElement('button', buttonTag => {
						buttonTag.classList.add('btn');
						buttonTag.classList.add('btn-danger');
						buttonTag.append(CreateElement('div', divTag => {
							divTag.style.display = 'none';
							divTag.append(`${tdTags[6].querySelector('a').href} ${tdTags[1].children[0].href === nationLink} ${resource}`);
						}));
						buttonTag.append(tdTags[6].querySelector('a img'));
						buttonTag.append(' Delete');
						buttonTag.onclick = DeleteOffer;
					}));
				}
				return;
			}
			if (offerType.endsWith('Personal')) {
				divTag.append(CreateElement('b', bTag => {
					bTag.classList.add('Show');
					if (offerType === 'Personal') {
						bTag.append(sellerWanted ? 'BUYING' : 'SELLING');
						return;
					}
					bTag.append(tdTags[1].children[0].href === nationLink ? 'SELLING' : 'BUYING');
				}));
				divTag.append(CreateElement('button', buttonTag => {
					buttonTag.classList.add('btn')
					buttonTag.classList.add('btn-danger');
					buttonTag.append(CreateElement('div', divTag => {
						divTag.style.display = 'none';
						divTag.append(`${tdTags[6].querySelector('a').href} ${offerType === 'Personal' ? sellerWanted : tdTags[2].children[0].href === nationLink} ${resource}`);
					}));
					buttonTag.append(tdTags[6].querySelector('img'));
					buttonTag.append(' Delete');
					buttonTag.onclick = DeleteOffer;
				}));
				return;
			}
			divTag.append(tdTags[6].querySelector('img'));
			if (tdTags[6].childElementCount) {
				divTag.append(CreateElement('b', bTag => bTag.append(tdTags[1].children[0].href == nationLink ? ' SOLD' : ' BOUGHT')));
				divTag.append(document.createElement('br'));
				divTag.append(`${tdTags[6].children[1].childNodes[0].textContent} ${tdTags[6].children[1].childNodes[2].textContent}`);
			}
		}));

		// Date
		divTag.append(CreateElement('div', divTag => {
			divTag.classList.add('Date');
			divTag.style.gridArea = 'Date';
			divTag.append(`${tdTags[3].childNodes[0].textContent} ${tdTags[3].childNodes[2].textContent}`);
		}));
	}));
}

function GenerateNationInfo(offerType, divTag, tdTag, offerWanted, message) {
	if (offerType === 'Open' || offerType === 'Personal' || offerType === 'Embargo') {
		if (offerWanted) {
			divTag.classList.add('Hide');
			divTag.append(CreateElement('b', bTag => bTag.append(message)));
			return;
		}
	}
	else if (tdTag.children[0].href === nationLink) {
		divTag.classList.add('Hide');
	}
	GetNationData(divTag, tdTag);
}

function GetNationData(divTag, tdTag) {
	divTag.append(CreateElement('a', aTag => {
		aTag.href = tdTag.children[0].href
		aTag.append(tdTag.children[0].textContent)
		aTag.append(CreateElement('img', imgTag => {
			imgTag.classList.add('tinyflag');
			imgTag.src = tdTag.children[0].children[0].src;
		}));
	}));
	divTag.append(document.createElement('br'));
	divTag.append(tdTag.children[1].nextSibling.textContent.trim());
	divTag.append(document.createElement('br'));
	if (tdTag.lastChild.href) {
		divTag.append(CreateElement('a', aTag => {
			aTag.href = tdTag.lastChild.href;
			aTag.append(tdTag.lastChild.textContent);
		}));
	}
	else {
		divTag.append(CreateElement('i', iTag => iTag.append(tdTag.lastChild.textContent)));
	}
}

function UpdateTotal(inputTag) {
	if (inputTag.target) {
		inputTag = this;
	}
	if (inputTag.value.toString().indexOf('.') >= 0) {
		inputTag.value = Math.floor(inputTag.value);
	}
	const divTag = inputTag.parentElement.parentElement.parentElement.querySelector('.Price');
	const price = parseInt(divTag.textContent.slice(1).split('/')[0].replaceAll(',', ''));
	divTag.children[0].textContent = `$${(price * inputTag.value).toLocaleString()}`;
}

async function DeleteOffer() {
	this.disabled = true;
	const data = this.children[0].textContent.split(' ');
	await fetch(data.shift());
	const divTag = this.parentElement.tagName === 'FORM' ? this.parentElement.parentElement.parentElement : this.parentElement.parentElement;
	const quantity = parseInt(divTag.querySelector('.Quantity').textContent.trim().replaceAll(',', ''));
	if (data[0] === 'true') {
		const price = parseInt(divTag.querySelector('.Price').textContent.slice(1).split('/')[0].replaceAll(',', ''));
		myOffers.Money -= price * quantity;
	}
	else {
		myOffers[data[1]] -= quantity;
	}
	divTag.remove();
	if (!localStorage.getItem('Doc_VT_ZeroAccountability')) {
		UpdateLinks();
	}
}

function Mistrade() {
	if (marketType < 2) {
		return false;
	}
	let args = location.search.slice(1).split('&');
	let checkOne = false;
	let checkTwo = false;
	let checkThree = true;
	while (args.length) {
		const arg = args.shift().split('=');
		if (arg[0] === 'buysell') {
			if (!arg[1].length) {
				checkOne = true;
			}
		}
		else if (arg[0] === 'resource1') {
			if (arg[1].length) {
				checkTwo = true;
			}
		}
		else if (arg[0] === 'od') {
			if (arg[1] === 'DESC') {
				checkThree = false;
			}
		}
	}
	if (checkOne && checkTwo) {
		const sellTag = checkThree ? Array.from(document.querySelectorAll('.sOffer')).pop() : document.querySelector('.sOffer');
		const buyTag = checkThree ? document.querySelector('.bOffer') : Array.from(document.querySelectorAll('.bOffer')).pop();
		if (!(sellTag && buyTag)) {
			return false;
		}
		if (parseInt(sellTag.querySelector('.Price').textContent.slice(1).split('/')[0].replaceAll(',', '')) > parseInt(buyTag.querySelector('.Price').textContent.slice(1).split('/')[0].replaceAll(',', ''))) {
			// Scroll to Mistrade.
			const tag = new Date(sellTag.querySelector('.Date').textContent).getTime() > new Date(buyTag.querySelector('.Date').textContent).getTime() ? sellTag : buyTag;
			tag.scrollIntoView({
				behavour: 'smooth',
				block: 'center'
			});
			tag.classList.add('Outline');

			// Switch Themes.
			const linkTag = Array.from(document.querySelectorAll('link')).filter(x => x.href === 'https://politicsandwar.com/css/dark-theme.min.css')[0];
			document.querySelector('#TableTheme').innerText = `.Offer:nth-child(2n) { background: ${linkTag ? '#d2d3e8' : '#1f1f1f'}; }`;
			if (linkTag) {
				linkTag.remove();
			}
			else {
				document.head.append(CreateElement('link', linkTag => {
					linkTag.rel = 'stylesheet';
					linkTag.href = 'https://politicsandwar.com/css/dark-theme.css';
				}));
			}

			// Announce that you detected a mistrade for Mistrade Detection Script.
			document.body.append(CreateElement('div', divTag => {
				divTag.style.display = 'none';
				divTag.id = 'Doc_Scrolled';
			}));
			return true;
		}
	}
	return false;
}

function MarketLinks() {
	const formTag = Array.from(document.querySelector('#rightcolumn').children).filter(tag => tag.tagName == 'FORM')[0];
	formTag.parentElement.insertBefore(CreateElement('p', pTag => {
		pTag.style.textAlign = 'center';
		pTag.append(MarketLink('Oil'));
		pTag.append(' | ');
		pTag.append(MarketLink('Coal'));
		pTag.append(' | ');
		pTag.append(MarketLink('Iron'));
		pTag.append(' | ');
		pTag.append(MarketLink('Bauxite'));
		pTag.append(' | ');
		pTag.append(MarketLink('Lead'));
		pTag.append(' | ');
		pTag.append(MarketLink('Uranium'));
		pTag.append(' | ');
		pTag.append(MarketLink('Food'));
		pTag.append(document.createElement('br'));
		pTag.append(MarketLink('Gasoline'));
		pTag.append(' | ');
		pTag.append(MarketLink('Steel'));
		pTag.append(' | ');
		pTag.append(MarketLink('Aluminum'));
		pTag.append(' | ');
		pTag.append(MarketLink('Munitions'));
		pTag.append(' | ');
		pTag.append(MarketLink('Credits'));
		pTag.append(document.createElement('br'));
		pTag.append(CreateElement('a', aTag => {
			aTag.href = 'https://politicsandwar.com/index.php?id=26&display=nation&resource1=&buysell=&ob=date&od=DESC&maximum=100&minimum=0&search=Go';
			aTag.append('My Trades');
		}));
		pTag.append(' | ');
		pTag.append(CreateElement('a', aTag => {
			aTag.href = `${nationLink}&display=trade`;
			aTag.append('Activity');
		}));
	}), formTag);
	formTag.parentElement.insertBefore(document.createElement('hr'), formTag);
}

function MarketLink(resource) {
	return CreateElement('a', aTag => {
		aTag.href = `https://politicsandwar.com/index.php?id=90&display=world&resource1=${resource.toLowerCase()}&buysell=&ob=price&od=ASC&maximum=100&minimum=0&search=Go`;
		aTag.append(CreateElement('img', imgTag => {
			if (resource == 'Food') {
				imgTag.src = 'https://politicsandwar.com/img/icons/16/steak_meat.png';
			}
			else if (resource == 'Credits') {
				imgTag.src = 'https://politicsandwar.com/img/icons/16/point_gold.png';
			}
			else {
				imgTag.src = `https://politicsandwar.com/img/resources/${resource.toLowerCase()}.png`;
			}
		}));
		aTag.append(` ${resource}${localStorage.getItem(`Doc_VT_ReGain_${resource}`) ? '*' : ''}`);
	});
}

function ReGain() {
	const pTag = (() => {
		const imgTag = document.querySelector('img[alt="Success"]');
		if (imgTag) {
			return imgTag.parentElement;
		}
	})();
	if (!pTag) {
		return;
	}
	pTag.className = 'ReGain';
	const text = ReplaceAll(pTag.textContent.trim(), '  ', ' ').split(' ');
	if (text[2] !== 'accepted') {
		return;
	}
	let quantity = parseInt(text[8].replaceAll(',', ''));
	const price = parseInt(text[14].slice(1, -1).replaceAll(',', '')) / quantity;
	const bought = text[7] === 'bought';
	const key = `Doc_VT_ReGain_${text[9][0].toUpperCase() + text[9].slice(1, -1).toLowerCase()}`;
	let data = JSON.parse(localStorage.getItem(key));
	let profit = 0;

	// Update Info if transaction was made in profit.
	if (data && data.bought != bought) {
		for (let i = 0; i < data.levels.length; ++i) {
			if ((!bought && price > data.levels[i].price) || (bought && price < data.levels[i].price)) {
				profit += Math.min(data.levels[i].quantity, quantity) * Math.abs(data.levels[i].price - price);
				data.levels[i].quantity -= quantity;
				if (data.levels[i].quantity >= 0) {
					quantity = 0;
					break;
				}
				quantity = data.levels[i].quantity * -1;
			}
		}
		data.levels = data.levels.filter(x => x.quantity > 0);
		if (data.levels.length) {
			localStorage.setItem(key, JSON.stringify(data));
		}
		else {
			localStorage.removeItem(key);
		}
	}

	pTag.append(` $${price.toLocaleString()}/Ton.`);
	// Add Re-Sell/Buy for Profit Button.
	pTag.append(document.createElement('br'));
	data = JSON.parse(localStorage.getItem(key));
	let buttonExists = false;
	if ((!data || data.bought == bought) && quantity) {
		buttonExists = true;
		pTag.append(CreateElement('a', aTag => {
			aTag.id = 'Doc_ReGain';
			aTag.innerText = `Re${bought ? 'sell' : 'buy'} for Profit?`;
			aTag.onclick = () => {
				if (data) {
					let exists = false;
					for (let i = 0; i < data.levels.length; ++i) {
						if (data.levels[i].price == price) {
							exists = true;
							data.levels[i].quantity += quantity;
							break;
						}
					}
					if (!exists) {
						data.levels.push({
							'quantity': quantity,
							'price': price
						});
						data.levels.sort((x, y) => x.price - y.price);
						if (bought) {
							data.levels.reverse();
						}
					}
					localStorage.setItem(key, JSON.stringify(data));
				}
				else {
					localStorage.setItem(key, JSON.stringify({
						'bought': bought,
						'levels': [
							{
								'quantity': quantity,
								'price': price,
							}
						]
					}));
				}

				UpdateQuantities();
				pTag.removeChild(aTag);
				if (profit) {
					pTag.innerHTML = pTag.innerHTML.replaceAll(' | ', '');
				}
				MiddleScroll();
			};
		}));
	}
	if ((!data || data.bought == bought) && profit && quantity) {
		pTag.append(' | ');
	}
	if (profit) {
		pTag.append(`Made $${profit.toLocaleString()} Profit.`);
	}
	return buttonExists;
}

function ReGainCurrentLevels() {
	if (currentResource != 'Money') {
		const data = JSON.parse(localStorage.getItem(`Doc_VT_ReGain_${currentResource}`));
		if (data) {
			const formTag = Array.from(document.querySelector('#rightcolumn').children).filter(tag => tag.tagName == 'FORM')[0];
			formTag.parentElement.insertBefore(CreateElement('div', divTag => {
				divTag.id = 'RegainLevelDiv';
				divTag.style.display = 'flex';
				divTag.style.flexDirection = 'row';
				divTag.style.flexWrap = 'wrap';
				divTag.style.justifyContent = 'space-around';
				divTag.style.alignContent = 'center';
				divTag.style.textAlign = 'center';
				for (let i = 0; i < data.levels.length; ++i) {
					divTag.append(CreateElement('p', pTag => {
						pTag.id = `RegainLevel${i}`;
						pTag.style.padding = '0.5em';
						pTag.style.margin = '0';
						pTag.innerText = `${data.bought ? 'Bought' : 'Sold'} ${data.levels[i].quantity.toLocaleString()} Ton${data.levels[i].quantity > 1 ? 's' : ''} @ $${data.levels[i].price.toLocaleString()}/ton | `;
						pTag.append(CreateElement('a', aTag => {
							aTag.innerText = 'Forget';
							aTag.onclick = () => {
								ForgetAboutIt(data.levels[i].price, i);
							};
						}));
					}));
				}
				if (data.levels.length > 1) {
					divTag.append(CreateElement('a', aTag => {
						aTag.style.padding = '0.5em';
						aTag.style.margin = '0';
						aTag.innerText = 'Forget All';
						aTag.onclick = () => {
							ForgetAboutIt(-1);
						};
					}));
				}
			}), formTag);
			formTag.parentElement.insertBefore(CreateElement('hr', hrTag => {
				hrTag.id = 'RegainLevelHr';
			}), formTag);
		}
	}
}

function ForgetAboutIt(price, i) {
	const key = `Doc_VT_ReGain_${currentResource}`;
	if (price < 0) {
		localStorage.removeItem(key);
		document.querySelector('#RegainLevelDiv').remove();
		document.querySelector('#RegainLevelHr').remove();
	}
	else {
		let data = JSON.parse(localStorage.getItem(key));
		data.levels = data.levels.filter(x => x.price != price);
		if (data.levels.length) {
			localStorage.setItem(key, JSON.stringify(data));
			document.querySelector(`#RegainLevel${i}`).remove();
		}
		else {
			localStorage.removeItem(key);
			document.querySelector('#RegainLevelDiv').remove();
			document.querySelector('#RegainLevelHr').remove();
		}
	}
	UpdateQuantities();
}

async function InfiniteScroll() {
	if (marketType > 0 && localStorage.getItem('Doc_VT_InfiniteScroll')) {
		const pTags = Array.from(document.querySelectorAll('p.center'))
		const alreadyLoaded = (() => {
			const nums = pTags[4].textContent.split(' ')[1].split('-');
			if (nums[0] !== '0') {
				location.href = GetURL(0);
			}
			return parseInt(nums[1]);
		})();
		const pagesToLoad = (() => {
			const text = pTags[4].textContent.split(' ');
			text.splice(1, 2);
			pTags[4].innerText = text.join(' ');
			return Math.ceil((parseInt(text[1]) - alreadyLoaded) / 100);
		})();
		pTags[2].append(pTags[3].children[4]);
		pTags[5].parentElement.removeChild(pTags[5]);
		if (alreadyLoaded < 50) {
			pTags[3].innerText = `Note: The game by default only loaded ${alreadyLoaded} trade offers.`;
			pTags[3].append(document.createElement('br'));
			pTags[3].append('We strongly recommend going to your ');
			pTags[3].append(CreateElement('a', aTag => {
				aTag.target = '_blank';
				aTag.href = 'https://politicsandwar.com/account/#4';
				aTag.innerText = 'Account';
			}));
			pTags[3].append(' settings and changing the default search results to 50,');
			pTags[3].append(document.createElement('br'));
			pTags[3].append('or if this was a link provided by some bot, that you ask the maximum query in the link to be set to at least 50, preferably 100.');
		}
		else {
			pTags[3].parentElement.removeChild(pTags[3]);
		}

		if (pagesToLoad) {
			for (let i = 0; i < pagesToLoad; ++i) {
				const url = GetURL(100 * i + alreadyLoaded);
				console.time(`Load Page - ${i + 1}`);
				const doc = new DOMParser().parseFromString(await (await fetch(url)).text(), 'text/html');
				console.timeEnd(`Load Page - ${i + 1}`);
				console.time('Convert Table');
				let trTags = Array.from(doc.querySelector('.nationtable').children[0].children).slice(1);
				while (trTags.length) {
					const trTag = trTags.shift();
					try {
						ConvertRow(Array.from(trTag.children));
					}
					catch (e) {
						console.error(trTag, e);
					}
				}
				console.timeEnd('Convert Table');
			}
		}
	}
}

function GetURL(min) {
	let args = location.search.slice(1).split('&');
	let minFound = false;
	let maxFound = false;
	for (let j = 0; j < args.length; ++j) {
		let arg = args[j].split('=');
		if (arg[0] == 'minimum') {
			minFound = true;
			arg[1] = min;
			args[j] = arg.join('=');
			if (maxFound) {
				break;
			}
		}
		else if (arg[0] == 'maximum') {
			maxFound = true;
			if (arg[1] != 100) {
				arg[1] = 100;
				args[j] = arg.join('=');
			}
			if (minFound) {
				break;
			}
		}
	}

	if (!minFound) {
		args.push(`minimum=${min}`);
	}
	if (!maxFound) {
		args.push('maximum=100');
	}

	return location.origin + location.pathname + '?' + args.join('&');
}

function MiddleScroll() {
	if (marketType > 0 && (() => {
		let args = location.search.slice(1).split('&');
		let checkOne = false;
		let checkTwo = false;
		while (args.length) {
			const arg = args.shift().split('=');
			if (arg[0] === 'buysell') {
				if (!arg[1].length) {
					checkOne = true;
				}
			}
			else if (arg[0] === 'resource1') {
				if (arg[1].length) {
					checkTwo = true;
				}
			}
		}
		return checkOne && checkTwo;
	})()) {
		document.querySelector('#Offers').insertBefore(document.createElement('hr'), document.querySelector(`.${document.querySelector('.Hide').textContent === 'SELLERS WANTED' ? 'b' : 's'}Offer`));
		Array.from(document.querySelectorAll(`.${document.querySelector('.Hide').textContent === 'SELLERS WANTED' ? 's' : 'b'}Offer`)).pop().scrollIntoView({
			behavior: 'smooth',
			block: 'center'
		});
	}
}

async function Sleep(ms) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(true);
		}, ms);
	});
}

function UpdateQuantities() {
	if (currentResource !== 'Money') {
		const json = JSON.parse(localStorage.getItem(`Doc_VT_ReGain_${currentResource}`));
		if (json) {
			let divTags = Array.from(document.querySelectorAll('.Offer'));
			while (divTags.length) {
				const divTag = divTags.shift();
				const inputTag = divTag.querySelector('input[name="rcustomamount"]');
				if (inputTag && divTag.querySelector('.Hide').textContent === 'SELLERS WANTED' === json.bought) {
					const offerPrice = parseInt(divTag.querySelector('.Price').textContent.slice(1).split('/')[0].replaceAll(',', ''));
					let quantity = 0;
					for (let i = 0; i < json.levels.length; ++i) {
						if ((json.bought && offerPrice > json.levels[i].price) || (!json.bought && offerPrice < json.levels[i].price)) {
							quantity += json.levels[i].quantity;
						}
					}
					inputTag.value = Math.min(parseInt(inputTag.value), quantity);
				}
			}
		}
	}
}

function UpdateLinks() {
	for (let resource in myOffers) {
		if (resource === 'Money') {
			continue;
		}
		for (let i = 0; i < 2; ++i) {
			let aTags = Array.from(document.querySelectorAll(`.${i % 2 ? 's' : 'b'}Outbid_${resource}`));
			while (aTags.length) {
				const aTag = aTags.shift();
				const price = parseInt(aTag.parentElement.parentElement.querySelector('.Price').textContent.slice(1).split('/')[0].replaceAll(',', ''));
				const link = CreateOfferLink(resource, price + (i % 2 ? 1 : -1), i % 2);
				if (link) {
					aTag.setAttribute('href', link);
					aTag.style.textDecoration = 'none';
				}
				else {
					aTag.removeAttribute('href');
					aTag.style.textDecoration = 'line-through';
				}
			}
			aTags = Array.from(document.querySelectorAll(`.${i % 2 ? 's' : 'b'}Match_${resource}`)).concat(Array.from(document.querySelectorAll(`.${i % 2 ? 's' : 'b'}TopUp_${resource}`)));
			while (aTags.length) {
				const aTag = aTags.shift();
				const price = parseInt(aTag.parentElement.parentElement.querySelector('.Price').textContent.slice(1).split('/')[0].replaceAll(',', ''));
				const link = CreateOfferLink(resource, price, i % 2);
				if (link) {
					aTag.setAttribute('href', link);
					aTag.style.textDecoration = 'none';
				}
				else {
					aTag.removeAttribute('href');
					aTag.style.textDecoration = 'line-through';
				}
			}
		}
	}
}

function CreateOfferLink(resource, price, isSellOffer) {
	const quantity = (() => {
		if (localStorage.getItem('Doc_VT_ZeroAccountability')) {
			return Math.max(Math.floor(isSellOffer ? (resources.Money + MinAmount('Money')) / price : resources[resource] + MinAmount(resource)), 0);
		}
		return Math.max(Math.floor(isSellOffer ? (resources.Money - myOffers.Money) / price : resources[resource] - myOffers[resource]), 0);
	})();
	const max = parseInt(localStorage.getItem(`Doc_MaxResource_${resource}`));
	if (quantity > 0) {
		return `https://politicsandwar.com/nation/trade/create/?resource=${resource.toLowerCase()}&p=${price}&q=${quantity > max ? max : quantity}&t=${isSellOffer ? 'b' : 's'}`;
	}
}

/* Start
-------------------------*/
document.head.append(CreateElement('style', styleTag => {
	styleTag.append('#Offers { text-align: center; }');
	styleTag.append('.Offer { display: grid; grid-template-columns: repeat(8, 1fr); align-items: center; grid-gap: 1em; padding: 1em; }');
	styleTag.append('.Nations { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-areas: "Left Right"; align-items: center; grid-gap: 1em; overflow-wrap: anywhere; }')
	styleTag.append('.sOffer { grid-template-areas: "Nations Nations Nations Nations Date Quantity Price Form" "Nations Nations Nations Nations Date Quantity Create Form"; }');
	styleTag.append('.bOffer { grid-template-areas: "Nations Nations Nations Nations Date Quantity Price Form" "Nations Nations Nations Nations Date Quantity Create Form"; }');
	styleTag.append('.Show { display: none; }');
	styleTag.append('@media only screen and (max-width: 991px) { .Show { display: block; } .Hide { display: none; } .Nations { grid-template-columns: 1fr; grid-template-areas: "Left" "Right"; } .Offer { grid-template-columns: repeat(6, 1fr); grid-template-areas: "Nations Nations Date Quantity Price Form" "Nations Nations Date Quantity Create Form"; } }');
	styleTag.append('@media only screen and (max-width: 600px) { .Offer { grid-template-columns: repeat(4, 1fr); grid-template-areas: "Nations Quantity Price Form" "Nations Date Create Form"; } }');
	styleTag.append('@media only screen and (max-width: 440px) { .Offer { grid-template-columns: repeat(3, 1fr); grid-template-areas: "Nations Quantity Form" "Nations Price Form" "Nations Create Form" "Date Date Date"; } }');
	styleTag.append('.Offer input { transition: 300ms; }');
	styleTag.append('.Offer input:hover, .Offer input:focus { border-radius: 10px; }');
	styleTag.append('.Offer input.sSubmit { background-color: #5cb85c; }');
	styleTag.append('.Offer input.bSubmit { background-color: #337ab7; }');
	styleTag.append('.ReGain { text-align: center; }');
	styleTag.append('.Outline { outline-style: solid; outline-color: #d9534f; outline-width: 0.25em; }');
	styleTag.append('#Offers hr { border: 0.25em solid #d9534f; margin: 0; }');
	styleTag.append('.Doc_Config { text-align: center; padding: 0 1em; font-size: 0.8em; }');
	styleTag.append('.Doc_Config b { font-size: 1.25em; }');
	styleTag.append('.Doc_Config button { font-size: inherit; font-weight: normal; padding: 0; }');
	styleTag.append('.Doc_Config hr { margin: 0.5em 0; }');
	styleTag.append('.Doc_Config input { margin: 0; }');
}));
document.head.append(CreateElement('style', styleTag => {
	styleTag.id = 'TableTheme';
	styleTag.append(`.Offer:nth-child(2n) { background: ${Array.from(document.querySelectorAll('link')).filter(x => x.href === 'https://politicsandwar.com/css/dark-theme.min.css').length ? '#1f1f1f' : '#d2d3e8'}; }`);
}));

async function Main() {
	console.time('Convert Table');
	const divTag = CreateElement('div', divTag => {
		divTag.id = 'Offers';
		const tableTag = document.querySelector('.nationtable');
		tableTag.parentElement.insertBefore(divTag, tableTag);

		let trTags = Array.from(tableTag.children[0].children).slice(1);
		while (trTags.length) {
			const trTag = trTags.shift();
			try {
				ConvertRow(Array.from(trTag.children));
				trTag.remove();
			}
			catch (e) {
				console.error(trTag, e);
			}
		}
		tableTag.remove();
	});
	console.timeEnd('Convert Table');
	const mistradeExists = Mistrade();
	const buttonExists = ReGain();
	MarketLinks();
	ReGainCurrentLevels();
	await InfiniteScroll();
	if (mistradeExists && buttonExists) {
		document.querySelector('#Doc_ReGain').click();
	}
	else if (!(mistradeExists || Mistrade() || buttonExists)) {
		if (buttonExists === false) {
			await Sleep(3000);
		}
		MiddleScroll();
	}
	console.time('Updating');
	UpdateQuantities();
	UpdateLinks();
	console.timeEnd('Updating');
}

if (marketType > -1) {
	Main();
}