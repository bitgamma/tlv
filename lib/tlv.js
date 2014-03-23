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
 * @param {number} originalLength
 */
exports.TLV = function(tag, value, originalLength) {  
  Object.defineProperty(this, 'tag', { value: tag });
  Object.defineProperty(this, 'value', { value: value });
  Object.defineProperty(this, 'constructed', { value: value instanceof Array });
  
  if (originalLength !== undefined) {
    Object.defineProperty(this, 'originalLength', { value: originalLength });    
  }
  
  Object.defineProperty(this, 'byteLength', { get: this.getByteLength });
}

/**
 * Calculates and returns the byte length of the encoded TLV.
 * This value can be used to allocate a buffer able to contain the encoded TLV.
 *
 * @return {number} byteLength
 */
exports.TLV.prototype.getByteLength = function() {
  var lenTag = 4;
  
  while(lenTag > 1) {
    var tmpTag = this.tag >>> ((lenTag - 1) * 8);
    
    if ((tmpTag & 0xFF) != 0x00) {
      break;
    } 
    
    lenTag--;
  }
  
  var lenValue = 0;
  
  if (this.constructed) {
    for (var i = 0; i < this.value.length; i++) {
      lenValue = lenValue + this.value[i].byteLength;
    }
  } else {
    lenValue = this.value.length;
  }    
  
  var lenOfLen;
  
  if (lenValue > 0x00FFFFFF) {
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
  
  return lenTag + lenOfLen + lenValue;
}


/**
 * Parses (recursively) all the TLVs in the buffer and returns them in an array. 
 * The buffer is expected to only contain valid TLV values.
 * 
 * @param {Buffer} buf
 * @return {Array} tlvs
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
  var value;
  
  if (buf[index] == 0x80) {
    if (!constructed) {
      throw new Error("Only constructed TLV can have indefinite length");      
    }
    
    value = this.parseAll(buf.slice(index), true);
    for (var i = 0; i < value.length; i++) {
      index = index + value[i].originalLength;
    }
    
    return new this.TLV(tag, value, index + 2);
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
  
  if (constructed) {
    value = this.parseAll(value);
  } else {
    var tmpBuffer = value;
    value = new Buffer(tmpBuffer.length);
    tmpBuffer.copy(value);
  }
    
  return new this.TLV(tag, value, index);
};