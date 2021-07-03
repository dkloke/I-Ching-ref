const axios = require( 'axios' );
const cheerio = require( 'cheerio' );
const {writeFile} = require("fs");
const {Console} = console;
const {log, error} = new Console( {
    stdout: process.stdout,
    inspectOptions: {compact: true, breakLength: 120, depth: 4}
} );

const {iChing} = require( "./ichingObject" );
// log("typeof iChing",typeof iChing);
// log("iChing.constructor.name",iChing.constructor.name);
// // log(iChing)
// process.exit();
const workList = [...iChing.reduce( ( list, e ) => {
    list.add( e.url.split( "#" )
        .shift() );
    return list;
}, new Set() )];
log( workList.length );


const rxGetKW = / (\d+) \+\+\+\+/;

// axios.all();
// const url = 'http://www.pantherwebworks.com/I_Ching/bk1h1-10.html';

// takes a page returns an array of divs containing a hexagram
const pageSplitter = page => {
    const comments = page.match( /<!--([^>]*)>/g );
    const boundaries = comments.filter( e => (e.search( /(START|container)/ ) > -1) )
        .reduce( ( bounds, e, i ) => {
            if( (i % 2) === 0 ) {
                bounds.push( [e] );
            }
            else {
                bounds[bounds.length - 1].push( e );
            }
            return bounds;
        }, [] );
    return boundaries.map( b => [parseInt( b[0].match( rxGetKW )[1] ), page.split( b[0] )[1].split( b[1] )
        .shift()
        .trim()] );
};

function Line( position, isRuler, value, text, comment ) {
    return {position, isRuler, value, text, comment };
}

const textToArray = $$ => $$.text()
    .trim()
    .split( /\n/g )
    .map( t => t.trim() );

const hexSplitter = ( [kw, html] ) => {
        const o = {
            kingWen: kw,
            intro: [],
            judgement: "",
            judgeText: [],
            image: "",
            imageText: [],
            lines: [],
        };
        // return an object of parts
        const $ = cheerio.load( html );
        const blurb = $( "div.hexWrap" )
            .children( "p" );
        let peg;
        blurb.each( ( i, e ) => {
            const $e = $( e );
            const txt = textToArray( $e );
            switch ( $e.attr( "class" ) ) {
                case "subTitle":
                    peg = o.intro;
                    break;
                case "judgSub":
                    o.judgement = txt;
                    peg = o.judgeText;
                    break;
                case "imageSub":
                    o.image = txt;
                    peg = o.imageText;
                    break;
                default:
                    if(txt.length!==0 && txt[0].toLowerCase()!=="back to key")
                        peg.push( txt );
            }
        } );
        // log(o)
        const lines = $( "div.containLines" )
            .children( "ul" );

        lines.each( ( i, e ) => {
            const $e = $( e );
            const govRuler = $e.attr( "class" ) === "govRuler";
            const spans = $e
                .children( "li" )
                .children( "a" )
                .children( "span" );
            const text = textToArray($( spans[0] ));
            const value = text[0].startsWith( "Six" ) ? 6 : text[0].startsWith( "Nine" ) ? 9 : 0;
            const comment = textToArray($( spans[1] ));

            //
            // log( ">>", spans.length, i, e.tagName, $e.attr( "class" ) );
            // spans.each( ( ii, ee ) => {
            //     const $ee = $(ee);
            //     log( ">> >>", ii, ee.tagName, $( ee )
            //         .attr( "class" ) );
            //     log( $( ee )
            //         .text() );
            // } );
            o.lines.push( new Line( i + 1, govRuler, value, text, comment ) );
        } );


        return o;
    }


;(async () => {
    // const url = workList[0];
    try {
        const requests = await Promise.all( workList.map( url => axios( url ) ) );
        const pages = await Promise.all( requests.map( resp => resp.data ) );
        log( pages.length );
        const bounds = pages.reduce( ( a, e ) => ([...a, ...pageSplitter( e )]), [] );
        log( bounds.length );

        const content = bounds.map(e=>hexSplitter(e))

        log( content.length );

        const work = iChing.map(hex=>{
            const item = content.find(({kingWen})=>hex.kingWen===kingWen);
            return {...hex,...item};
        })

        writeFile("iChing.json",JSON.stringify(work,null,"\t"),err=>{
            if(err) return log(err);
            log("done");
        })




        // log( bounds.map( e => e[0].match( rxGetKW )[1] ) );
        // log( bounds.reduce((a,e)=>{a.add(e[1]); return a},new Set()))


        //
        //     const response = await axios(url);
        //     const html = await response.data;
        //     const comments = html.match(/<!--([^>]*)>/g);
        //     const sections = comments.filter(e=>(e.search(/(START|container)/)>-1))
        //     log(sections);
        // }

    }
    catch ( err ) {
        throw err;
        // log(err);

    }

})();
