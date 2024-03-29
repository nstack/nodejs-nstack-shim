#!/usr/bin/env node
"use strict";
// any 1st & 3rd-party modules here
let fs = require('fs');
let path = require('path');
let process = require('process');
// load the app to call into
let service = require('./service');
let nstack = require('./nstack');
// let util = require('util');
// console.log('app - \n\t', util.inspect(app, false, null));
// console.log('nstack - \n\t', util.inspect(nstack, false, null));

///////////////////////////////////////////////////////////////////////////////
// Utils
const REQ_JSON = '.req.json';
const RESP_JSON = '.resp.json';

// simple error handling
function gen_error(code, msg, _data) {
    let data = typeof _data !== 'undefined' ? _data : {};
    // b = typeof b !== 'undefined' ?  b : 1;
    return { error: code, msg: msg, data: data };
}

// custom write func as bloody Node can't write to a named pipe otherwise!
function sync_write_resp(resp) {
    let buf = new Buffer(JSON.stringify(resp));
    let fd = fs.openSync(RESP_JSON, 'w');
    fs.writeSync(fd, buf, 0, buf.length, -1);
    fs.closeSync(fd)
}

///////////////////////////////////////////////////////////////////////////////
// Main Run function
function run(req) {
    // tell the client helper the current taskid
    nstack.req_id = req['req_id'];

    let ms = req['method'].split('.');
    let iface_name = ms[0];
    let func_name = ms[1];
    let params = req['params'];

    // get the iface, then the func, and call it dyn
    if (iface_name in service) {
        let iface_impl = service[iface_name];

        if (func_name in iface_impl) {
            let func_impl = iface_impl[func_name];

            // TODO - how to use spread with dyn call into object?
            // return  func_impl(...params)
            return  func_impl.apply(iface_impl, params)
                    .catch(function(result) {
                        if (typeof result == 'string') {
                            return Promise.reject(gen_error(-32602, result))
                        } else {
                            return Promise.reject(gen_error(-32602, result[0], result[1]))
                        }
                    })
        }
        else { return Promise.reject(gen_error(-32601, 'Method not found')); }
    }
    else { return Promise.reject(gen_error(-32601, 'Service not found')); }
}


// top-level error handling
process.on('uncaughtException', function(err) {
    console.log('Uncaught Exception - %s', err);
    let resp = gen_error(-32000, err.toString());
    sync_write_resp(resp);
    process.exit(0);
});

//process.on('SIGTERM', function() {
//    //console.log('Received shutdown signal');
//    process.exit(0);
//});

// mutual recursion to handle processing req->resp
// Thank god for TCO in ES6
function process_resp(resp) {
    process.chdir(nstack.root_dir);
    // save the json resp
    sync_write_resp(resp);
    process_req();
}

function process_req() {
    // open the json req
    let req = JSON.parse(fs.readFileSync(REQ_JSON, 'utf8'));

    process.chdir(path.join('.nstack', req['req_id']));

    // run the command sync/async and then return the result or error
    run(req)
    .then(function(resp) {
        process_resp({ result: resp });
    })
    .catch(function(err) {
        process_resp(err);
    });
}

// start the loop
process_req();
