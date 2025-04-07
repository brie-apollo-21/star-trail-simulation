import { get } from "svelte/store";
import { BSC } from "./BSC";

//Greg Miller (gmiller@gregmiller.net) 2021
//Released as public domain
//http://www.celestialprogramming.com/

//All input and output angles are in radians, jd is Julian Date in UTC
function earthRotationAngle(jd){
    //IERS Technical Note No. 32

    const t = jd- 2451545.0;
    const f = jd%1.0;

    let theta = 2*Math.PI * (f + 0.7790572732640 + 0.00273781191135448 * t); //eq 14
    theta%=2*Math.PI;
    if(theta<0)theta+=2*Math.PI;

    return theta;

}
function greenwichMeanSiderealTime(jd){
    //"Expressions for IAU 2000 precession quantities" N. Capitaine1,P.T.Wallace2, and J. Chapront
    const t = ((jd - 2451545.0)) / 36525.0;

    let gmst=earthRotationAngle(jd)+(0.014506 + 4612.156534*t + 1.3915817*t*t - 0.00000044 *t*t*t - 0.000029956*t*t*t*t - 0.0000000368*t*t*t*t*t)/60.0/60.0*Math.PI/180.0;  //eq 42
    gmst%=2*Math.PI;
    if(gmst<0) gmst+=2*Math.PI;

    return gmst;
}
export function raDecToAltAz(ra,dec,lat,lon,jd_ut){
    //Meeus 13.5 and 13.6, modified so West longitudes are negative and 0 is North
    const gmst=greenwichMeanSiderealTime(jd_ut);
    let localSiderealTime=(gmst+lon)%(2*Math.PI);
    
    
    let H=(localSiderealTime - ra);
    if(H<0){H+=2*Math.PI;}
    if(H>Math.PI){H=H-2*Math.PI;}
    
    let az = (Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(lat) - Math.tan(dec)*Math.cos(lat)));
    let a = (Math.asin(Math.sin(lat)*Math.sin(dec) + Math.cos(lat)*Math.cos(dec)*Math.cos(H)));
    az-=Math.PI;
    
    if(az<0){az+=2*Math.PI;}
    
    return [a,az,localSiderealTime,H];
}



// End of Greg Miller (gmiller@gregmiller.net) 2021 code

// function greenwichApparentSiderealTime(jd_ut){
//     const D_TT = jd_ut - 2451545
//     const gmst = greenwichMeanSiderealTime(jd_ut)
//     const eqeq = ((-0.000319 * radToDeg(Math.sin(degToRad(125.04 - (0.052954*D_TT))))) - (0.000024 * radToDeg(Math.sin(degToRad(2*(280.47 + (0.98565*D_TT)))))))*radToDeg(Math.cos(degToRad(23.4393 - (0.0000004*D_TT))))
//     console.log(eqeq)
//     const gast = gmst+degToRad(eqeq)

//     return gast;
// }

function altAzToCoords(a, az, r) {
    const x = r*Math.sin((Math.PI/2)-a)*Math.cos(az)
    const z = r*Math.sin((Math.PI/2)-a)*Math.sin(az)
    const y = r*Math.cos((Math.PI/2)-a)

    return [x, y, z]
}


function normalizeRad(rad) {
    if(rad < 0) {
        return (2*Math.PI*(Math.floor(Math.abs(rad)/(2*Math.PI))+1))+rad
    } else if(rad > 2*Math.PI) {
        return rad%(2*Math.PI)
    } else {
        return rad
    }
}

function normalizeDeg(deg) {
    if(deg < 0) {
        return (360*(Math.floor(Math.abs(deg)/360)+1))+deg
    } else if(deg > 360) {
        return deg%360
    } else {
        return deg
    }
}

function degToRad(deg) {
    return normalizeDeg(deg)*(Math.PI/180)
}

function radToDeg(rad) {
    return normalizeRad(rad)/(Math.PI/180)
}

function getSmallestAngleDiff(a1, a2) {
    if(a1 < 0 || a1 > 2*Math.PI) {
        console.log("a1 not normalized")
    }
    if(a2 < 0 || a2 > 2*Math.PI) {
        console.log("a2 not normalized")
    }
    return normalizeRad(Math.min((2 * Math.PI) - Math.abs(a1 - a2), Math.abs(a1 - a2)))
}

function raVisible(ra, dec, lat, lon, jd_ut) {
    const gmst = greenwichMeanSiderealTime(jd_ut);
    const lmst = normalizeRad(gmst+lon);
    let lha = normalizeRad(lmst - ra);
    // if(lha<0){lha+=2*Math.PI;}
    // if(lha>Math.PI){lha=lha-2*Math.PI;}

    // limit not using 90 deg for tolerances
    // if(getSmallestAngleDiff(ra, lmst) < normalizeRad((Math.PI/2)+lat)) {
    //     return true
    // } else {
    //     return false
    // }

    // alternative way of writing (angle from observer to star)
    if(getSmallestAngleDiff(lha, Math.PI*2) < (Math.PI/2)) {
        return true
    } else {
        return false
    }
}

function decVisible(dec, lat) {
    if(getSmallestAngleDiff(dec, lat) < (Math.PI/2)) {
        return true
    } else {
        return false
    }
    // let dec_max = undefined
    // let dec_min = undefined
    // if(lat > 0) {
    //     dec_max = Math.PI/2
    //     dec_min = -(Math.PI/2 - lat)
    // } else {
    //     dec_min = -Math.PI/2
    //     dec_max = Math.PI/2 - lat
    // }

    // if(dec < getSmallestAngleDiff(lat, Math.PI/2)) {
    //     return true
    // } else {
    //     return false
    // }
}

function checkVisible(ra, dec, lat, lon, jd_ut) {
    if (raVisible(ra, dec, lat, lon, jd_ut)) {
        return true
    } else {
        return false
    }
}

function raStringToRad(str) {
    const split = str.split(":")
    const hour = Number(split[0])*15
    const min = Number(split[1])/4
    const sec = Number(split[2])/240

    return degToRad(hour+min+sec)
}

function decStringToRad(str) {
    const split = str.split(":")
    const deg = Number(split[0])
    const min = Number(split[1])/60
    const sec = Number(split[2])/3600

    if(deg+min+sec < 0) {
        return degToRad(deg+min+sec+360)
    }

    return degToRad(deg+min+sec)
}

export function getVisibleStars(lat, lon, jd_ut) {
    let stars = []
    lat = normalizeRad(degToRad(lat))
    lon = normalizeRad(degToRad(lon))

    for(let i = 0; i < BSC.length; i++) {
        const ra = raStringToRad(BSC[i].RA)
        const dec = decStringToRad(BSC[i].DEC)
        const altaz = raDecToAltAz(ra, dec, lat, lon, jd_ut)

        if(altaz[0] > 0) {
            stars.push({
                id: BSC[i]['harvard_ref_#'],
                mag: BSC[i].MAG,
                coords: altAzToCoords(altaz[0], altaz[1], 5000),
                color: "#ffffff"
            })
        }
    }
    // console.log(checkVisible(4.1978, -0.4623, -6.17700, 106.62840, 2460765.010417))
    return stars
}

// 24 hours of star coordinates
export function getStarTrails(lat, lon, jd_ut) {
    const timestep = 1/24/60 // minutes
    let stars = []
    lat = normalizeRad(degToRad(lat))
    lon = normalizeRad(degToRad(lon))

    let maxMag = -Infinity
    let minMag = Infinity

    for(let i = 0; i < BSC.length; i++) {
        const ra = raStringToRad(BSC[i].RA)
        const dec = decStringToRad(BSC[i].DEC)
        const altaz = raDecToAltAz(ra, dec, lat, lon, jd_ut)
        if(altaz[0] > 0) {
            if(BSC[i].MAG > maxMag) {
                maxMag = BSC[i].MAG
            }
            if(BSC[i].MAG < minMag) {
                minMag = BSC[i].MAG
            }
            let coords = []
            for(let j = 0; j < 24*60; j++) {
                const altaz = raDecToAltAz(ra, dec, lat, lon, (jd_ut+(timestep*j)))
                coords.push(altAzToCoords(altaz[0], altaz[1], 5000))
            }
            stars.push({
                id: BSC[i]['harvard_ref_#'],
                mag: BSC[i].MAG,
                coords: coords,
                color: "#ffffff"
            })
        }
    }
    
    return {'stars': stars, 'maxMag': maxMag, 'minMag': minMag}
}