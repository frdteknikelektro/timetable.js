/*jshint -W079*/

'use strict';

var Datetable = function() {
	this.scope = {
		dateStart: new Date(2016, 9, 3),
		dateEnd: new Date(2016, 9, 4)
	};
	this.locations = [];
	this.events = [];
};

Datetable.Renderer = function(tt) {
	if (!(tt instanceof Datetable)) {
		throw new Error('Initialize renderer using a Datetable');
	}
	this.datetable = tt;
};

(function() {
	function locationExistsIn(loc, locs) {
		return locs.indexOf(loc) !== -1;
	}
	function isValidDateRange(start, end) {
		var correctTypes = start instanceof Date && end instanceof Date;
		var correctOrder = start < end;
		return correctTypes && correctOrder;
	}
	function getDuration(startDate, endDate) {
		return (new Date(endDate - startDate).getTime());
	}

	Datetable.prototype = {
		setScope: function(start, end) {
			if (isValidDateRange(start, end)) {
				this.scope.dateStart = start;
				this.scope.dateEnd = end;
			} else {
				throw new RangeError('Datetable scope should consist of (start, end) in Date format');
			}

			return this;
		},
		addLocations: function(newLocations) {
			function hasProperFormat() {
				return newLocations instanceof Array;
			}

			var existingLocations = this.locations;

			if (hasProperFormat()) {
				newLocations.forEach(function(loc) {
					if (!locationExistsIn(loc, existingLocations)) {
						existingLocations.push(loc);
					} else {
						throw new Error('Location already exists');
					}
				});
			} else {
				throw new Error('Tried to add locations in wrong format');
			}

			return this;
		},
		addEvent: function(name, location, start, end, options) {
			if (!locationExistsIn(location, this.locations)) {
				throw new Error('Unknown location');
			}
			if (!isValidDateRange(start, end)) {
				throw new Error('Invalid date range: ' + JSON.stringify([start, end]));
			}

			var optionsHasValidType = Object.prototype.toString.call(options) === '[object Object]';

			this.events.push({
				name: name,
				location: location,
				startDate: start,
				endDate: end,
				options: optionsHasValidType ? options : undefined
			});

			return this;
		}
	};

	function emptyNode(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}

	function prettyFormatDate(date) {
		var monthName = ['Jan', 'Feb', 'Mar', 'Apr',
										 'May', 'Jun', 'Jul', 'Aug',
										 'Sep', 'Oct', 'Nov', 'Dec'];
		var output = monthName[date.getMonth()] + ' ' + date.getDate();
		return output;
	}

	Datetable.Renderer.prototype = {
		draw: function(selector) {
			function checkContainerPrecondition(container) {
				if (container === null) {
					throw new Error('Datetable container not found');
				}
			}
			function appendDatetableAside(container) {
				var asideNode = container.appendChild(document.createElement('aside'));
				var asideULNode = asideNode.appendChild(document.createElement('ul'));
				appendRowHeaders(asideULNode);
			}
			function appendRowHeaders(ulNode) {
				for (var k=0; k<datetable.locations.length; k++) {
					var liNode = ulNode.appendChild(document.createElement('li'));
					var spanNode = liNode.appendChild(document.createElement('span'));
					spanNode.className = 'row-heading';
					spanNode.textContent = datetable.locations[k];
				}
			}
			function appendDatetableSection(container) {
				var sectionNode = container.appendChild(document.createElement('section'));
				var dateNode = sectionNode.appendChild(document.createElement('date'));
				appendColumnHeaders(dateNode);
				appendDateRows(dateNode);
			}
			function appendColumnHeaders(node) { //Wakwaw
				var headerNode = node.appendChild(document.createElement('header'));
				var headerULNode = headerNode.appendChild(document.createElement('ul'));

				var completed = false;
				// var looped = false;

				for (var date=datetable.scope.dateStart; !completed;) {
					var liNode = headerULNode.appendChild(document.createElement('li'));
					var spanNode = liNode.appendChild(document.createElement('span'));
					spanNode.className = 'date-label';
					spanNode.textContent = prettyFormatDate(date);

					date = new Date(date.getTime() + (24 * 60 * 60 * 1000));
					if (date >= datetable.scope.dateEnd) {
						liNode = headerULNode.appendChild(document.createElement('li'));
						spanNode = liNode.appendChild(document.createElement('span'));
						spanNode.textContent = '';
						completed = true;
					}
				}
			}
			function appendDateRows(node) {
				var ulNode = node.appendChild(document.createElement('ul'));
				ulNode.className = 'room-timeline';
				for (var k=0; k<datetable.locations.length; k++) {
					var liNode = ulNode.appendChild(document.createElement('li'));
					appendLocationEvents(datetable.locations[k], liNode);/**/
				}
			}
			function appendLocationEvents(location, node) {
				for (var k=0; k<datetable.events.length; k++) {
					var event = datetable.events[k];
					if (event.location === location) {
						appendEvent(event, node);
					}
				}
			}
			function appendEvent(event, node) {
				var hasOptions = event.options !== undefined;
				var hasURL, hasAdditionalClass, hasDataAttributes = false;

				if(hasOptions) {
					hasURL = (event.options.url !== undefined) ? true : false;
					hasAdditionalClass = (event.options.class !== undefined) ? true : false;
					hasDataAttributes = (event.options.data !== undefined) ? true : false;
				}

				var elementType = hasURL ? 'a' : 'span';
				var aNode = node.appendChild(document.createElement(elementType));
				var smallNode = aNode.appendChild(document.createElement('small'));
				aNode.title = event.name;

				if (hasURL) {
					aNode.href = event.options.url;
				}
				if(hasDataAttributes){
					for (var key in event.options.data) {
						aNode.setAttribute('data-'+key, event.options.data[key]);
					}
				}

				aNode.className = hasAdditionalClass ? 'date-entry ' + event.options.class : 'date-entry';
				aNode.style.width = computeEventBlockWidth(event);
				aNode.style.left = computeEventBlockOffset(event);
				smallNode.textContent = event.name;
			}
			function computeEventBlockWidth(event) {
				var start = event.startDate;
				var end = event.endDate;
				var durationDates = getDuration(start, end);
				return durationDates / scopeDurationDates * 100 + '%';
			}
			function computeEventBlockOffset(event) {
				var scopeStartDates = datetable.scope.dateStart;
				var eventStartDates = event.startDate;
				var datesBeforeEvent =  getDuration(scopeStartDates, eventStartDates);
				return datesBeforeEvent / scopeDurationDates * 100 + '%';
			}

			var datetable = this.datetable;
			var scopeDurationDates = getDuration(datetable.scope.dateStart, datetable.scope.dateEnd);
			var container = document.querySelector(selector);
			checkContainerPrecondition(container);
			emptyNode(container);
			appendDatetableAside(container);
			appendDatetableSection(container);
		}
	};

})();
