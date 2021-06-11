"use strict";

Number.prototype.dropDecimals = function () {
	return parseInt(this.toString());
};
Number.prototype.roundNearest = function (multiple) {
	return Math.round(this / multiple) * multiple;
};

String.prototype.camelCase = function (lowerCamelCase) {
	return (this.trim().charAt(0)[lowerCamelCase ? "toLowerCase" : "toUpperCase"]() + this.slice(1)).trim().replaceAll(" ", "");
};

function toSeconds(milliseconds) {
	if (!milliseconds) return toSeconds(Date.now());
	else if (typeof milliseconds === "object" && milliseconds instanceof Date) return toSeconds(milliseconds.getTime());
	else if (!isNaN(milliseconds)) return Math.trunc(milliseconds / 1000);
	else return toSeconds(Date.now());
}

function formatTORNTime(time) {
	time = time.toLowerCase();
	let seconds = 0;

	if (time.includes("h")) {
		seconds += parseInt(time.split("h")[0].trim()) * 60 * 60;
		time = time.split("h")[1];
	}
	if (time.includes("m")) {
		seconds += parseInt(time.split("m")[0].trim()) * 60;
		time = time.split("m")[1];
	}
	if (time.includes("s")) seconds += parseInt(time.split("s")[0].trim());

	return seconds;
}

function toMultipleDigits(number, digits = 2) {
	if (number === undefined) return undefined;
	return number.toString().length < digits ? toMultipleDigits(`0${number}`, digits) : number;
}

function formatTime(time = {}, options = {}) {
	if (typeof time === "number") return formatTime({ milliseconds: time, attributes: options });
	else if (time instanceof Date) return formatTime({ milliseconds: time.getTime() }, options);

	time = {
		milliseconds: undefined,
		seconds: undefined,
		...time,
	};
	options = {
		type: "normal",
		showDays: false,
		hideHours: false,
		hideSeconds: false,
		short: false,
		extraShort: false,
		agoFilter: false,
		daysToHours: false,
		...options,
	};

	let millis = 0;
	if (isDefined(time.milliseconds)) millis += time.milliseconds;
	if (isDefined(time.seconds)) millis += time.seconds * TO_MILLIS.SECONDS;

	let date;
	let parts;
	switch (options.type) {
		case "normal":
			date = new Date(millis);

			let hours = toMultipleDigits(date.getHours());
			const minutes = toMultipleDigits(date.getMinutes());
			const seconds = toMultipleDigits(date.getSeconds());

			switch (settings.formatting.time) {
				case "us":
					const afternoon = hours >= 12;
					hours = toMultipleDigits(hours % 12 || 12);

					return seconds ? `${hours}:${minutes}:${seconds} ${afternoon ? "PM" : "AM"}` : `${hours}:${minutes} ${afternoon ? "PM" : "AM"}`;
				case "eu":
				default:
					return seconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
			}
		case "timer":
			date = new Date(millis);

			parts = [];
			if (options.showDays) parts.push(Math.floor(date.getTime() / TO_MILLIS.DAYS));
			if (!options.hideHours) parts.push(date.getUTCHours() + (options.daysToHours ? 24 * Math.floor(millis / TO_MILLIS.DAYS) : 0));
			parts.push(date.getUTCMinutes());
			if (!options.hideSeconds) parts.push(date.getUTCSeconds());

			return parts.map((p) => toMultipleDigits(p, 2)).join(":");
		case "wordTimer":
			date = new Date(millis);

			parts = [];
			if (options.showDays && (date.getTime() / TO_MILLIS.DAYS).dropDecimals() > 0)
				parts.push(formatUnit(Math.floor(date.getTime() / TO_MILLIS.DAYS), { normal: "day", short: "day", extraShort: "d" }));
			if (!options.hideHours && date.getUTCHours()) parts.push(formatUnit(date.getUTCHours(), { normal: "hour", short: "hr", extraShort: "h" }));
			if (date.getUTCMinutes()) parts.push(formatUnit(date.getUTCMinutes(), { normal: "minute", short: "min", extraShort: "m" }));
			if (!options.hideSeconds && date.getUTCSeconds()) parts.push(formatUnit(date.getUTCSeconds(), { normal: "second", short: "sec", extraShort: "s" }));

			if (parts.length > 1 && !options.extraShort) {
				parts.insertAt(parts.length - 1, "and");
			}

			function formatUnit(amount, unit) {
				let formatted = `${amount}`;

				if (options.extraShort) {
					formatted += unit.extraShort;
				} else if (options.short) {
					formatted += ` ${unit.short}${applyPlural(amount)}`;
				} else {
					formatted += ` ${unit.normal}${applyPlural(amount)}`;
				}

				return formatted;
			}

			return parts.join(" ");
		case "ago":
			let timeAgo = Date.now() - millis;

			let token = "ago";
			if (timeAgo < 0) {
				token = "from now";
				timeAgo = Math.abs(timeAgo);
			}

			const UNITS = [
				{ unit: options.short ? "day" : "d", millis: TO_MILLIS.DAYS },
				{ unit: options.short ? "hr" : "hour", millis: TO_MILLIS.HOURS },
				{ unit: options.short ? "min" : "minute", millis: TO_MILLIS.MINUTES },
				{ unit: options.short ? "sec" : "second", millis: TO_MILLIS.SECONDS },
				{ text: options.short ? "now" : "just now", millis: 0 },
			];

			let _units = UNITS;
			if (options.agoFilter) _units = UNITS.filter((value) => value.millis <= options.agoFilter);

			for (const unit of _units) {
				if (timeAgo < unit.millis) continue;

				if (unit.unit) {
					const amount = Math.floor(timeAgo / unit.millis);

					return `${amount} ${unit.unit}${applyPlural(amount)} ${token}`;
				} else if (unit.text) {
					return unit.text;
				}
			}

			return timeAgo;
		default:
			return -1;
	}
}

function formatDate(date = {}, options = {}) {
	if (typeof date === "number") return formatDate({ milliseconds: date }, options);
	else if (date instanceof Date) return formatDate({ milliseconds: date.getTime() }, options);

	date = {
		milliseconds: undefined,
		...date,
	};
	options = {
		showYear: false,
		...options,
	};

	let millis = 0;
	if (isDefined(date.milliseconds)) millis += date.milliseconds;
	if (isDefined(date.seconds)) millis += date.seconds * TO_MILLIS.SECONDS;

	const _date = new Date(millis);
	const parts = [];
	let separator;

	switch (settings.formatting.date) {
		case "us":
			separator = "/";

			parts.push(_date.getMonth() + 1, _date.getDate());
			if (options.showYear) parts.push(_date.getFullYear());
			break;
		case "iso":
			separator = "-";

			if (options.showYear) parts.push(_date.getFullYear());
			parts.push(_date.getMonth() + 1, _date.getDate());
			break;
		case "eu":
		default:
			separator = ".";

			parts.push(_date.getDate(), _date.getMonth() + 1);
			if (options.showYear) parts.push(_date.getFullYear());
			break;
	}

	return parts.map((p) => toMultipleDigits(p)).join(separator);
}

function formatNumber(number, options = {}) {
	options = {
		shorten: false,
		formatter: false,
		decimals: -1,
		currency: false,
		forceOperation: false,
		...options,
	};
	if (typeof number !== "number") {
		if (isNaN(number)) return number;
		else number = parseFloat(number);
	}

	if (options.decimals !== -1) {
		number = options.decimals === 0 ? parseInt(number) : parseFloat(number.toFixed(options.decimals));
	}

	if (options.formatter) {
		return formatter.format(number);
	}

	const abstract = Math.abs(number);
	const operation = number < 0 ? "-" : options.forceOperation ? "+" : "";
	let text;

	if (options.shorten) {
		let words;
		if (options.shorten === true || options.shorten === 1) {
			words = {
				thousand: "k",
				million: "mil",
				billion: "bill",
			};
		} else {
			words = {
				thousand: "k",
				million: "m",
				billion: "b",
			};
		}

		if (abstract >= 1e9) {
			if (abstract % 1e9 === 0) text = (abstract / 1e9).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + words.billion;
			else text = (abstract / 1e9).toFixed(3) + words.billion;
		} else if (abstract >= 1e6) {
			if (abstract % 1e6 === 0) text = abstract / 1e6 + words.million;
			else text = (abstract / 1e6).toFixed(3) + words.million;
		} else if (abstract >= 1e3) {
			if (abstract % 1e3 === 0) text = abstract / 1e3 + words.thousand;
		}
	}

	if (!text) text = abstract.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

	return `${operation}${options.currency ? "$" : ""}${text}`;
}

function capitalizeText(text, options = {}) {
	options = {
		everyWord: false,
		...options,
	};

	if (!options.everyWord) return text[0].toUpperCase() + text.slice(1);

	return text
		.trim()
		.split(" ")
		.map((word) => capitalizeText(word))
		.join(" ")
		.trim();
}

function applyPlural(check) {
	return check !== 1 ? "s" : "";
}
