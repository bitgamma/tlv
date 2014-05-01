/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Ksenia Lebedeva
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Creates a TLV object. 
 * The originalLength parameter only makes sense for values parsed from a buffer.
 *
 * @param {number} tag 
 * @param {object} value
 * @param {number}
 */
exports.TLV = function(tag, value, indefiniteLength, originalLength) {  
  Object.defineProperty(this, 'tag', { value: tag });
  Object.defineProperty(this, 'value', { value: value });
  Object.defineProperty(this, 'constructed', { value: value instanceof Array });

  Object.defineProperty(this, 'indefiniteLength', { value: indefiniteLength === undefined ? false : indefiniteLength });    
  
  if (originalLength !== undefined) {
    Object.defineProperty(this, 'originalLength', { value: originalLength });    
  }
  
  Object.defineProperty(this, 'byteLength', { get: this.getByteLength });
}

/**
 * Calculates and returns the byte length of the encoded TLV.
 * This value can be used to allocate a buffer able to contain the encoded TLV.
 *
 * @return {number}
 */
exports.TLV.prototype.getByteLength = function() {
  var lenValue = getValueLength(this.value, this.constructed);
  return getTagLength(this.tag) + getLengthOfLength(lenValue, this.indefiniteLength) + lenValue;
}

/**
 * Returns the 1st child TLV of this object with the given tag. 
 * If there is no child with the given tag, returns null.
 *
 * @param {number} tagToSearch
 * @return {TLV}
 */
exports.TLV.prototype.getFirstChild = function(tagToSearch) {
  for (var i = 0; i < this.value.length; i++) {
    if (this.value[i].tag == tagToSearch) {
      return this.value[i];
    }
  }
  
  return null;
}

/**
 * Returns an Array of children TLV of this object with the given tag. 
 * If there is no child with the given tag, returns an empty Array.
 *
 * @param {number} tagToSearch
 * @return {Array}
 */
exports.TLV.prototype.getChildren = function(tagToSearch) {
  var result = [];
  for (var i = 0; i < this.value.length; i++) {
    if (this.value[i].tag == tagToSearch) {
      result.push(this.value[i]);
    }
  }
  
  return result;
}

/**
 * Encodes this TLV in the given Buffer object. If no Buffer object is given
 * a new one is created. The given or created buffer is returned for convenience.
 *
 * @param  {Buffer} buf
 * @return {Buffer}
 */
exports.TLV.prototype.encode = function(buf) {
  var tagLength = getTagLength(this.tag);
  var valueLength = getValueLength(this.value, this.constructed);
  var lenOfLen = getLengthOfLength(valueLength, this.indefiniteLength);
  
  if (buf === undefined) {
    buf = new Buffer(tagLength + valueLength + lenOfLen);
  }
  
  var index = 0;
  
  encodeNumber(buf, this.tag, tagLength);
  index += tagLength;
  
  if (this.indefiniteLength) {    
    buf[index++] = 0x80;
  } else if (lenOfLen == 1) {
    buf[index++] = valueLength;
  } else {
    lenOfLen--;
    buf[index++] = 0x80 | lenOfLen;
    encodeNumber(buf.slice(index), valueLength, lenOfLen);
    index += lenOfLen;
  }
  
  if (this.constructed) {
    for (var i = 0; i < this.value.length; i++) {
      this.value[i].encode(buf.slice(index));
      index = index + this.value[i].byteLength;
    }
    
    if (this.indefiniteLength) {
      buf[index++] = 0x00;
      buf[index++] = 0x00;
    }
  } else {
    this.value.copy(buf, index);
  }
  
  return buf;
}

/**
 * Returns a value of this TLV object, represented as an unsigned big endian.
 * The value can not be larger than 4 bytes.
 * 
 * @return {number}
 */
exports.TLV.prototype.getUIntValue = function() {
  var index = 0;
  var intValue = 0;
  var len = this.value.length;
  var msb = 0;
  
  if (len > 4) {
    throw new RangeError("The length of the value cannot be more than 4 bytes in this implementation");
  }
  
  if (len == 4) {
    msb = this.value[index++] * 0x1000000;
    len--;
  }
  
  while (len > 0) {
    intValue = intValue | this.value[index++];
    
    if (len > 1) {
      intValue = intValue << 8;
    }
    
    len--;
  }
   
  return msb + intValue;
}

/**
 * Returns a value of this TLV object, represented as an signed big endian.
 * The value can not be larger than 4 bytes.
 * 
 * @return {number}
 */
exports.TLV.prototype.getIntValue = function() {
  var index = 0;
  var intValue = 0;
  var len = this.value.length;
  var signMask = 0x80 << ((len - 1) * 8);
  var signExt = 0xFFFFFFFF << (len * 8);

  if (len > 4) {
    throw new RangeError("The length of the value cannot be more than 4 bytes in this implementation");
  }
  
  while (len > 0) {
    intValue = intValue | this.value[index++];
    
    if (len > 1) {
      intValue = intValue << 8;
    }
    
    len--;
  }
  
  if ((intValue & signMask) == signMask) {
    intValue = intValue | signExt;
  }
  
  return intValue;
}

/**
 * Encodes the given numeric value in the value Buffer of this object.
 * 
 * @param {number} intValue
 */
exports.TLV.prototype.setIntValue = function(intValue) {
  encodeNumber(this.value, intValue, this.value.length);
}

/**
 * Parses (recursively) all the TLVs in the buffer and returns them in an array. 
 * The buffer is expected to only contain valid TLV values.
 * 
 * @param {Buffer} buf
 * @return {Array}
 */
exports.parseAll = function(buf, stopOnEOC) {
  var tlvs = [];
  stopOnEOC = (stopOnEOC === undefined) ? false : stopOnEOC;
  
  for (var i = 0; i < buf.length; i += tlvs[tlvs.length - 1].originalLength) {
    var tlv = this.parse(buf.slice(i));
    
    if (stopOnEOC && tlv.tag == 0x00 && tlv.originalLength == 2) {
      break;
    }
    
    tlvs.push(tlv);  
  }
  
  return tlvs; 
}

/**
 * Parses (recursively) the first TLV in the buffer and returns it. 
 * Any data after the first TLV is ignored. 
 * The originalLength parameter of the returned object tells how many bytes from the buffer are part of the TLV.
 * The value of the TLV contains a copy of the data from the input buffer. Modifying the input buffer afterwards
 * does not affect the returned TLV object.
 * 
 * @param {Buffer} buf
 * @return {TLV}
 */
exports.parse = function(buf) {
  var index = 0;
  var tag = parseTag(buf);
  index += tag.length;
  
  var len = 0;
  var value;
  
  if (buf[index] == 0x80) {
    index++;
    
    if (!tag.constructed) {
      throw new Error("Only constructed TLV can have indefinite length");      
    }
    
    value = this.parseAll(buf.slice(index), true);
    for (var i = 0; i < value.length; i++) {
      index += value[i].originalLength;
    }
    
    return new this.TLV(tag.tag, value, true, index + 2);
  } else if ((buf[index] & 0x80) == 0x80) {
    var lenOfLen = buf[index++] & 0x7F;
    
    if (lenOfLen > 4) {
      throw new RangeError("The length of the value cannot be represented on more than 4 bytes in this implementation");
    }
    
    while(lenOfLen > 0) {
      len = len | buf[index++];
      
      if (lenOfLen > 1) {
        len = len << 8;
      }
      
      lenOfLen--;
    }    
  } else {
    len = buf[index++];
  }
  
  value = buf.slice(index, len + index);
  index += len;
  
  if (tag.constructed) {
    value = this.parseAll(value);
  } else {
    var tmpBuffer = value;
    value = new Buffer(tmpBuffer.length);
    tmpBuffer.copy(value);
  }
    
  return new this.TLV(tag.tag, value, false, index);
};

/**
 * Returns the byte length of the given tag.
 * 
 * @param {number} tag
 * @return {number}
 */
function getTagLength(tag) {
  var lenTag = 4;
  
  while(lenTag > 1) {
    var tmpTag = tag >>> ((lenTag - 1) * 8);
    
    if ((tmpTag & 0xFF) != 0x00) {
      break;
    } 
    
    lenTag--;
  }
  
  return lenTag;
}

/**
 * Returns the byte length of the given value.
 * Value can be either a Buffer or an array of TLVs.
 * 
 * @param {object} value
 * @param {boolean} constructed
 * @return {number}
 */
function getValueLength(value, constructed) {
  var lenValue = 0;
  
  if (constructed) {
    for (var i = 0; i < value.length; i++) {
      lenValue = lenValue + value[i].byteLength;
    }
  } else {
    lenValue = value.length;
  }    
  
  return lenValue;
} 

/**
 * Returns the number of bytes needed to encode the given length.
 * If the length is indefinite, this value takes in account the bytes needed to encode the EOC tag.
 * 
 * @param {number} lenValue
 * @param {boolean} indefiniteLength
 * @return {number}
 */
function getLengthOfLength(lenValue, indefiniteLength) {
  var lenOfLen;
  
  if (indefiniteLength) {
    lenOfLen = 3;
  } else if (lenValue > 0x00FFFFFF) {
    lenOfLen = 5;
  } else if (lenValue > 0x0000FFFF) {
    lenOfLen = 4;
  } else if (lenValue > 0x000000FF) {
    lenOfLen = 3;
  } else if (lenValue > 0x0000007F) {
    lenOfLen = 2; 
  } else {
    lenOfLen = 1;
  }
  
  return lenOfLen
}

/**
 * Encodes the given numeric value in the given Buffer, using the specified number of bytes.
 * 
 * @param {Buffer} buf
 * @param {number} value
 * @param {number} len
 */
function encodeNumber(buf, value, len) {
  var index = 0;
  
  while (len > 0) {
    var tmpValue = value >>> ((len - 1) * 8);
    buf[index++] = tmpValue & 0xFF;
    len--;
  }
}

/**
 * Parses the first bytes of the given Buffer as a TLV tag. The tag is returned as an object
 * containing the tag, its length in bytes and whether it is constructed or not.
 * 
 * @param {Buffer} buf
 * @return {object}
 */
function parseTag(buf) {
  var index = 0;
  var tag = buf[index++];
  var constructed = (tag & 0x20) == 0x20;
  
  if ((tag & 0x1F) == 0x1F) {
    do {
      tag = tag << 8;
      tag = tag | buf[index++];  
    } while((tag & 0x80) == 0x80);
    
    if (index > 4) {
      throw new RangeError("The length of the tag cannot be more than 4 bytes in this implementation");
    }
  }
  return { tag: tag, length: index, constructed: constructed };
}

/**
 * Parses the entire Buffer as a sequence of TLV tags. 
 * The tags are returned in an array, containing their numeric values.
 * 
 * @param {Buffer} buf
 * @return {Array}
 */
function parseAllTags(buf) {
  var result = [];
  var element;
  
  while (buf.length > 0) {
    element = parseTag(buf);
    buf = buf.slice(element.length);
    result.push(element.tag);
  }
  
  return result;
}

/**
 * Encodes an array of tags in a new Buffer. 
 * 
 * @param {Array} tags
 * @return {Buffer}
 */
function encodeTags(tags) {
  var bufLength = 0;
  var tagLengths = []
  
  for (var i = 0; i < tags.length; i++) {
    var tagLength = getTagLength(tags[i]);
    tagLengths.push(tagLength);
    bufLength += tagLength;
  }
  
  var buf = new Buffer(bufLength);
  var slicedBuf = buf;
  
  for (var i = 0; i < tags.length; i++) {
    encodeNumber(slicedBuf, tags[i], tagLengths[i]);
    slicedBuf = slicedBuf.slice(tagLengths[i]);
  }
  
  return buf;
}

exports.encodeTags = encodeTags;
exports.parseAllTags = parseAllTags;
exports.parseTag = parseTag;
exports.getTagLength = getTagLength;
exports.getValueLength = getValueLength;
exports.getLengthOfLength = getLengthOfLength;
