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

Encoding can be done using the TLV's encode method

* ```encode([buffer])``` => encodes the TLV object (recursively) in the given instance of Buffer. If the ```buffer``` object is not given a new one will be created

An example of TLV creation and encoding

```
var TLV = require('tlv').TLV;
var aTLV = new TLV(0x80, new Buffer([0xCA, 0xFE]));
var encodedTLV = aTLV.encode();
```

The resulting ```encodedTLV``` will contain the value ```[0x80, 0x02, 0xCA, 0xFE]```.

Additionally, there are methods to parse and encode only the tags of a TLV. This is useful for expressing a sequence of tags, for example
in a list of supported, or requested TLV objects.

These methods are part of the tlv module, not of the TLV object and they are:

* ```parseTag(buffer)``` => parses the first bytes of the buffer and returns them as an object containing the tag itself, its length in bytes and whether it refers to a constructed or primitive TLV.
* ```parseAllTags(buffer)``` => parses the entire buffer as a sequence of TLV-encoded tags and returns the values in an array.
* ```encodeTags(array)``` => takes an array of TLV tags and encodes them in a new Buffer object which is then returned.

### Searching in TLVs

Since TLV objects can be constructed, that is be composed as a sequence of child TLV objects, search capabilities by tag are provided. Obviously, these methods only apply to constructed TLVs and do not make sense on primitive ones. These methods are part of the TLV object:

* ```getFirstChild(tag)``` => returns the first child object with the given tag, or null if none is found
* ```getChildren(tag)``` => returns an array containing all children with the given tag, or an empty array if none are found

### Getting/Setting integer values

If the value in the TLV is an integer, you can get it with either ```getUIntValue()``` or ```getIntValue()``` to read the value as either a signed or unsigned big endian integer. The length of the value in this case must be between 1 and 4. Little endian values are not supported.

Encoding a number in the value of the TLV is just as easy. Using the ```setIntValue(number)``` method, the given number will be encoded in the TLV's value. This will overwrite data currently in the buffer. If the length of the buffer is more than 4 this method won't work.

## License

MIT License. Copyright 2014 Ksenia Lebedeva.
