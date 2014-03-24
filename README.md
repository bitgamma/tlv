[![Build Status](https://travis-ci.org/briksoftware/tlv.svg?branch=master)](https://travis-ci.org/briksoftware/tlv)

TLV is a small JavaScript library to parse and encode ASN.1 BER-TLV structures. It's focus is on small code and performance, avoiding copying memory unless necessary. It requires the Buffer object from node.js.

It supports tag and length encoding up to 4 bytes. Constructed TLV types are parsed recursively. Indefinite length format is also provided.

## Dependencies

* node v0.10.x
* mocha v1.18.x (only required to run the tests)
* chai v1.9.x (only required to run the tests)

## Examples

### Parsing and Encoding

Parsing a TLV could not be simpler

```
var tlv = require('tlv');
var buf = new Buffer(...); // some buffer here
var result = tlv.parse(buf);
```

The ```result``` variable holds reference to a TLV object. The TLV object has the following properties:

* ```tag``` => a number representing the tag of the TLV
* ```value``` => either a Buffer holding the value of the primitive TLV or an array of TLV object in case of constructed TLVs
* ```constructed``` => boolean, indicates if the TLV is constructed or primitive
* ```indefiniteLength``` => boolean, indicates if the TLV was encoded with indefinite length
* ```originalLength``` => the original length in bytes of the parsed TLV
* ```byteLength``` => the length of the encoded TLV. This may be different from originalLength, since this library always guarantees the shortest encoding but is able to parse TLVs encoded with suboptimal encoders.

Encoding can be done using the TLV's object only method

* ```encode([buffer])``` => encodes the TLV object (recursively) in the given instance of Buffer. If the ```buffer``` object is not given a new one will be created

An example of TLV creation and encoding

```
var TLV = require('tlv').TLV;
var aTLV = new TLV(0x80, new Buffer([0xCA, 0xFE]));
var encodedTLV = aTLV.encode();
```

The resulting ```encodedTLV``` will contain the value ```[0x80, 0x02, 0xCA, 0xFE]```.

## License

MIT License. Copyright 2014 Ksenia Lebedeva.
