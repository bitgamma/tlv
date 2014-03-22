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
 * The encodedLength parameter only makes sense for values parsed from a buffer.
 *
 * @param {number} tag 
 * @param {object} value
 * @param {number} encodedLength
 */
exports.TLV = function(tag, value, encodedLength) {  
  Object.defineProperty(this, 'tag', { value: tag });
  Object.defineProperty(this, 'value', { value: value });
  Object.defineProperty(this, 'constructed', { value: this.value instanceof Array });
  
  if (encodedLength !== undefined) {
    Object.defineProperty(this, 'encodedLength', { value: encodedLength });    
  }
}

/**
 * Parses (recursively) all the TLVs in the buffer and returns them in an array. 
 * The buffer is expected to only contain valid TLV values.
 * 
 * @param {Buffer} buf
 * @return {Array} tlvs
 */
exports.parseAll = function(buf) {
  var tlvs = [];
  
  for (var i = 0; i < buf.length; i += tlvs[tlvs.length - 1].encodedLength) {
    tlvs.push(this.parse(buf.slice(i)));   
  }
  
  return tlvs; 
}

/**
 * Parses (recursively) the first TLV in the buffer and returns it. 
 * Any data after the first TLV is ignored. 
 * The encodedLength parameter of the returned object tells how many bytes from the buffer are part of the TLV.
 * The value of the TLV contains a copy of the data from the input buffer. Modifying the input buffer afterwards
 * does not affect the returned TLV object.
 * 
 * @param {Buffer} buf
 * @return {TLV} tlv
 */
exports.parse = function(buf) {
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
  
  var len = 0;
  
  if ((buf[index] & 0x80) == 0x80) {
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
  
  var value = buf.slice(index, len + index);
  index += len;
  
  if (constructed) {
    value = this.parseAll(value);
  } else {
    var tmpBuffer = value;
    value = new Buffer(tmpBuffer.length);
    tmpBuffer.copy(value);
  }
    
  return new this.TLV(tag, value, index);
};