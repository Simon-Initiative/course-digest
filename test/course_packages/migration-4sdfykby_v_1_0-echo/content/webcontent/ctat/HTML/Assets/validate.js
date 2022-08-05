
//--------SIGNIFICANT FIGURES FUNCTIONS--------------
/**	
 *  Rounds a number to the given significant digits
 *
 * @param num			double/integer to be rounded
 *		  sig			integer defining the number of significant digits to keep
 * @return 				the number to the given significant digits
*/
function round_sig(num, sig){
    var factor = Math.pow(10,sig-Math.ceil(Math.log(Math.abs(num))/Math.LN10));
    return Math.round(num*factor)/factor;
}

/**	
 *  Formats a number to the given significant digits
 *
 * @param num			double/integer to be rounded
 *		  sig			integer defining the number of significant digits to keep
 * @return 				the number to the given significant digits
*/
function format_sig(num, sig){
    var strAbs=round_sig(Math.abs(parseFloat(num)),sig)+'';
	var strSign=""+((parseFloat(num)<0)?"-":"");
	var str=round_sig(parseFloat(num),sig)+'';
	var nDig=number_sig(str);
	while (nDig<sig) {
		if (nDig==strAbs.length) {
			strAbs+=".";
		}
		nDig++;
		strAbs+='0';
	}	
	return strSign+strAbs;
}

/**	
 *  Counts the number of significant digits
 *
 * @param num			double/integer to know its number of significant figures
 * @return 				the number of significant digits
*/
function number_sig(num) {
	if(isNaN(num)) return 0;
	var str=num+'';
    var nDig=0;
    var isSignificant=false;
	for(var i=0;i<str.length;i++) {
		if (str.substring(i,i+1)!="0" && str.substring(i,i+1)!="." 
				&& str.substring(i,i+1)!="-" && str.substring(i,i+1)!="+") isSignificant=true;
		if (isNaN(str.substring(i,i+1)) && str.substring(i,i+1)!="."
				&& str.substring(i,i+1)!="-" && str.substring(i,i+1)!="+") break;
		if (isSignificant) nDig+=(isDigit(str.substring(i,i+1)))?1:0;
	}
	return parseInt(nDig);		
}