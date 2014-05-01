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

describe('TLV', function() {
  var chai = require('chai');
  var expect = chai.expect;
  var tlv = require('../lib/tlv');
  var TLV = tlv.TLV;
  chai.should();
  
  describe('#parse', function() {
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length on 1 byte.', function() {
      var buf = new Buffer([0x80, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]);
      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x80);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(6);
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
      buf[2] = 0xAA;
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length 0x00', function() {
      var res = tlv.parse(new Buffer([0x80, 0x00]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x80);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(2);
      res.value.should.deep.equal(new Buffer([]));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length 0x7F', function() {
      var buf = new Buffer(129);
      buf[0] = 0x80;
      buf[1] = 0x7F
      
      for (i = 2; i < buf.length; i++) {
        buf[i] = i;
      }
      
      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x80);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(buf.length);
      res.value.should.deep.equal(buf.slice(2, buf.length));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length on 2 bytes', function() {
      var buf = new Buffer(131);
      buf[0] = 0xC4;
      buf[1] = 0x81;
      buf[2] = 0x80;
      
      for (i = 3; i < buf.length; i++) {
        buf[i] = i;
      }
      
      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0xC4);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(buf.length);
      res.value.should.deep.equal(buf.slice(3, buf.length));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length on 3 bytes and spurious data at end', function() {
      var buf = new Buffer(0x109);
      buf[0] = 0x80;
      buf[1] = 0x82;
      buf[2] = 0x01;
      buf[3] = 0x00;
      
      for (i = 4; i < buf.length; i++) {
        buf[i] = i;
      }
      
      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x80);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal((buf.length - 5));
      res.value.should.deep.equal(buf.slice(4, (buf.length - 5)));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length on 4 bytes and spurious data at end', function() {
      var buf = new Buffer(0x1000A);
      buf[0] = 0x12;
      buf[1] = 0x83;
      buf[2] = 0x01;
      buf[3] = 0x00;
      buf[4] = 0x00;
      
      for (i = 5; i < buf.length; i++) {
        buf[i] = i;
      }
      
      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x12);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(buf.length - 5);
      res.value.should.deep.equal(buf.slice(5, (buf.length - 5)));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length on 5 bytes and spurious data at end', function() {
      var buf = new Buffer(0x100000B);
      buf[0] = 0x80;
      buf[1] = 0x84;
      buf[2] = 0x01;
      buf[3] = 0x00;
      buf[4] = 0x00;
      buf[5] = 0x00;
      buf[6] = 0xFF;
      buf[buf.length - 1] = 0xFF;

      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x80);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(buf.length - 5);
      res.value.should.deep.equal(buf.slice(6, (buf.length - 5)));
    });
    
    it('should throw an exception when provided a buffer with primitive tag on 1 byte and length on 6 bytes', function() {
      var buf = new Buffer(0x1000007);
      buf[0] = 0x80;
      buf[1] = 0x85;
      buf[2] = 0x01;
      buf[3] = 0x00;
      buf[4] = 0x00;
      buf[5] = 0x00;
      buf[6] = 0x00;
      
      (function(){ tlv.parse(buf); }).should.throw(RangeError);
    });
    
    it('should return a TLV object when provided a buffer with constructed tag on 1 byte and length on 1 byte.', function() {
      var res = tlv.parse(new Buffer([0xE1, 0x08, 0x80, 0x02, 0xBA, 0xBE, 0x82, 0x02, 0xBB, 0xBC]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0xE1);
      res.constructed.should.equal(true);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(10);
      res.value.should.deep.equal([
        new TLV(0x80, new Buffer([0xBA, 0xBE]), 4),
        new TLV(0x82, new Buffer([0xBB, 0xBC]), 4)
      ]);
    });
    
    it('should return a TLV object when provided a buffer with constructed tag on 1 byte and zero length.', function() {
      var res = tlv.parse(new Buffer([0xE1, 0x00]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0xE1);
      res.constructed.should.equal(true);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(2);
      res.value.should.deep.equal([]);
    });
    
    it('should return a TLV object when provided a buffer with constructed tlvs with 2 levels of nesting', function() {
      var res = tlv.parse(new Buffer([0xE1, 0x0C, 0xA0, 0x04, 0x82, 0x02, 0xCA, 0xFE, 0x00, 0x00, 0x83, 0x02, 0xBB, 0xBC]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0xE1);
      res.constructed.should.equal(true);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(14);
      res.value.should.deep.equal([
        new TLV(0xA0, [new TLV(0x82, new Buffer([0xCA, 0xFE]), 4)], 6),
        new TLV(0x00, new Buffer(0), 2),
        new TLV(0x83, new Buffer([0xBB, 0xBC]), 4)
      ]);
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 2 bytes and length on 2 bytes.', function() {
      var res = tlv.parse(new Buffer([0x9F, 0x70, 0x81, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x9F70);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(8);
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 3 bytes and length on 2 bytes.', function() {
      var res = tlv.parse(new Buffer([0x9F, 0x85, 0x22, 0x81, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x9F8522);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(9);
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 4 bytes and length on 2 bytes.', function() {
      var res = tlv.parse(new Buffer([0x1F, 0x85, 0xA2, 0x01, 0x81, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x1F85A201);
      res.constructed.should.equal(false);
      res.indefiniteLength.should.equal(false);
      res.originalLength.should.equal(10);
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should throw an exception when provided a buffer with primitive tag on 5 bytes.', function() {
      var buf = new Buffer([0x1F, 0x85, 0xA2, 0x81, 0x01, 0x00]);
      (function(){ tlv.parse(buf); }).should.throw(RangeError);
    });
    
    it('should return a TLV object when provided a buffer with constructed tag and indefinite length and spurious data after the end.', function() {
      var res = tlv.parse(new Buffer([0xE1, 0x80, 0x81, 0x02, 0x00, 0x00, 0x82, 0x02, 0xBB, 0xBC, 0x00, 0x00, 0xAA, 0xFF]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0xE1);
      res.constructed.should.equal(true);
      res.indefiniteLength.should.equal(true);
      res.originalLength.should.equal(12);
      res.value.should.deep.equal([
        new TLV(0x81, new Buffer([0x00, 0x00]), 4),
        new TLV(0x82, new Buffer([0xBB, 0xBC]), 4)
      ]);
    });
    
    it('should return a TLV object when provided a buffer with constructed tag and indefinite length.', function() {
      var buf = new Buffer([0xe1, 0x80, 0xa0, 0x03, 0x81, 0x01, 0x03, 0x00, 0x00]);
      var res = tlv.parse(buf);
      
      res.tag.should.equal(0xe1);
      res.constructed.should.equal(true);
      res.indefiniteLength.should.equal(true);
      res.originalLength.should.equal(9);
    });
    
    it('should throw an exception when provided a buffer with primitive tag and indefinite length.', function() {
      var buf = new Buffer([0xC0, 0x80, 0x81, 0x01, 0x00, 0x00, 0x00]);
      (function(){ tlv.parse(buf); }).should.throw(Error);
    });
  });
  
  describe('#byteLength', function() {
    it('should return the length of an encoded TLV object with primitive tag on 1 byte and length 7F', function() {
      var buf = new Buffer(0x7F);
      for (i = 0; i < buf.length; i++) {
        buf[i] = i;
      }
      
      var tlv = new TLV(0xC2, buf);
      tlv.byteLength.should.equal(129);
    });
    
    it('should return the length of an encoded TLV object with primitive tag on 2 bytes and length 0', function() {
      var buf = new Buffer(0);
      
      var tlv = new TLV(0x9FC2, buf);
      tlv.byteLength.should.equal(3);
    }); 
    
    it('should return the length of an encoded TLV object with primitive tag on 3 bytes and length on 3 bytes', function() {
      var buf = new Buffer(0x100);
         
      var tlv = new TLV(0x9FC2C2, buf);
      tlv.byteLength.should.equal(0x106);
    }); 
    
    it('should return the length of an encoded TLV object with primitive tag on 4 bytes and length on 2 bytes', function() {
      var buf = new Buffer(0x80);

      var tlv = new TLV(0x9FC2C222, buf);
      tlv.byteLength.should.equal(0x86);
    }); 
    
    it('should return the length of an encoded TLV object with constructed tag', function() {
      var buf = new Buffer(0x80);

      var tlvChild1 = new TLV(0x9F70, buf);
      var tlvChild2 = new TLV(0x82, new Buffer(1));
      var tlv = new TLV(0x3F12, [tlvChild1, tlvChild2]);
      
      tlv.byteLength.should.equal(0x8B);
    });
    
    it('should return the length of an encoded TLV object with constructed tag and indefinite length', function() {
      var buf = new Buffer(0x80);

      var tlvChild1 = new TLV(0x9F70, buf, true);
      var tlvChild2 = new TLV(0x82, new Buffer(1));
      var tlv = new TLV(0x3F12, [tlvChild1, tlvChild2]);
      
      tlv.byteLength.should.equal(0x8C);
    });
  });
  
  describe('#encode', function() {
    it('should encode the TLV object in the given Buffer. The TLV is primitive with tag on 1 byte and length on 1 byte', function() {
      var outputBuf = new Buffer(6);
      var buf = new Buffer([0xCA, 0xFE, 0xBA, 0xBE]);
      var tlv = new TLV(0x80, buf);
      var returnedBuf = tlv.encode(outputBuf);
      returnedBuf.should.equal(outputBuf);
      returnedBuf.should.deep.equal(new Buffer([0x80, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a Buffer containing the encoded TLV object. The TLV is primitive with tag on 1 byte and length on 1 byte', function() {
      var tlvHeader = new Buffer([0x80, 0x7F]);
      var buf = new Buffer(0x7F);
      var tlv = new TLV(0x80, buf);
      tlv.encode().should.deep.equal(Buffer.concat([tlvHeader, buf]));
    });    
    
    it('should return a Buffer containing the encoded TLV object. The TLV is constructed with tag on 1 byte and length on 1 byte', function() {
      var buf = new Buffer([0xBA, 0xBE]);
      var tlv = new TLV(0xA0, [new TLV(0xCA, buf)]);
      tlv.encode().should.deep.equal(new Buffer([0xA0, 0x04, 0xCA, 0x02, 0xBA, 0xBE]));
    });
    
    it('should return a Buffer containing the encoded TLV object. The TLV is primitive with tag on 2 bytes and length on 1 byte', function() {
      var buf = new Buffer([0xCA, 0xFE, 0xBA, 0xBE]);
      var tlv = new TLV(0x9F70, buf);
      tlv.encode().should.deep.equal(new Buffer([0x9F, 0x70, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a Buffer containing the encoded TLV object. The TLV is primitive with tag on 3 bytes and length on 2 bytes', function() {
      var tlvHeader = new Buffer([0x9F, 0x81, 0x20, 0x81, 0x80]);
      var buf = new Buffer(0x80);
      var tlv = new TLV(0x9F8120, buf);
      tlv.encode().should.deep.equal(Buffer.concat([tlvHeader, buf]));
    });
    
    it('should return a Buffer containing the encoded TLV object. The TLV is primitive with tag on 1 byte and length on 3 bytes', function() {
      var tlvHeader = new Buffer([0xC0, 0x82, 0x01, 0x00]);
      var buf = new Buffer(0x100);
      var tlv = new TLV(0xC0, buf);
      tlv.encode().should.deep.equal(Buffer.concat([tlvHeader, buf]));
    });
    
    it('should return a Buffer containing the encoded TLV object. The TLV is constructed with tag on 1 byte and indefinite length', function() {
      var buf = new Buffer([0xBA, 0xBE]);
      var tlv = new TLV(0xA0, [new TLV(0xCA, buf)], true);
      tlv.encode().should.deep.equal(new Buffer([0xA0, 0x80, 0xCA, 0x02, 0xBA, 0xBE, 0x00, 0x00]));
    });
  });
  
  describe('#getFirstChild', function() {
    it('should return the first child with the given tag', function() {
      var parentTlv = new TLV(0xE1, [
        new TLV(0x80, new Buffer([0xfa, 0xfb])),
        new TLV(0x81, new Buffer([0xaa, 0xab])),
        new TLV(0x82, new Buffer([0xda, 0xdb])),
        new TLV(0x81, new Buffer([0xff, 0xff])),
        new TLV(0x83, new Buffer([0xdf, 0xaf])),
      ]);
      
      var child = parentTlv.getFirstChild(0x80);
      child.tag.should.equal(0x80);
      child.value.should.deep.equal(new Buffer([0xfa, 0xfb]));
      
      child = parentTlv.getFirstChild(0x81);
      child.tag.should.equal(0x81);
      child.value.should.deep.equal(new Buffer([0xaa, 0xab]));
      
      child = parentTlv.getFirstChild(0x82);
      child.tag.should.equal(0x82);
      child.value.should.deep.equal(new Buffer([0xda, 0xdb]));
      
      child = parentTlv.getFirstChild(0x83);
      child.tag.should.equal(0x83);
      child.value.should.deep.equal(new Buffer([0xdf, 0xaf]));
    });
    
    it('should return null if no child with the given tag is found', function() {
      var parentTlv = new TLV(0xE1, [
        new TLV(0x80, new Buffer([0xfa, 0xfb])),
        new TLV(0x81, new Buffer([0xaa, 0xab])),
        new TLV(0x82, new Buffer([0xda, 0xdb])),
        new TLV(0x81, new Buffer([0xff, 0xff])),
        new TLV(0x83, new Buffer([0xdf, 0xaf])),
      ]);
      
      expect(parentTlv.getFirstChild(0x84)).to.be.null;
    });
  });
  
  describe('#getChildren', function() {
    it('should return all children with the given tag', function() {
      var parentTlv = new TLV(0xE1, [
        new TLV(0x80, new Buffer([0xfa, 0xfb])),
        new TLV(0x81, new Buffer([0xaa, 0xab])),
        new TLV(0x81, new Buffer([0xa1, 0xa2])),
        new TLV(0x82, new Buffer([0xda, 0xdb])),
        new TLV(0x81, new Buffer([0xff, 0xff])),
        new TLV(0x83, new Buffer([0xdf, 0xaf])),
      ]);
      
      var children = parentTlv.getChildren(0x80);
      children.should.deep.equal([parentTlv.value[0]]);
      
      children = parentTlv.getChildren(0x81);
      children.should.deep.equal([parentTlv.value[1], parentTlv.value[2], parentTlv.value[4]]);
      
      children = parentTlv.getChildren(0x82);
      children.should.deep.equal([parentTlv.value[3]]);
      
      children = parentTlv.getChildren(0x83);
      children.should.deep.equal([parentTlv.value[5]]);
    });
    
    it('should return an empty array if no children with the given tag are found', function() {
      var parentTlv = new TLV(0xE1, [
        new TLV(0x80, new Buffer([0xfa, 0xfb])),
        new TLV(0x81, new Buffer([0xaa, 0xab])),
        new TLV(0x81, new Buffer([0xa1, 0xa2])),
        new TLV(0x82, new Buffer([0xda, 0xdb])),
        new TLV(0x81, new Buffer([0xff, 0xff])),
        new TLV(0x83, new Buffer([0xdf, 0xaf])),
      ]);
      
      parentTlv.getChildren(0x84).should.deep.equal([]);
    });
  });
  
  describe('#parseTag', function() {
    it('should parse a tag and returns it as an object with tag, length and constructed properties', function() {
      var buf = new Buffer([0x9f, 0x70]);
      var tag = tlv.parseTag(buf);
      tag.tag.should.equal(0x9f70);
      tag.length.should.equal(2);
      tag.constructed.should.equal(false);
    });
  });
  
  describe('#parseAllTags', function() {
    it('should parse the entire buffer as TLV tags and returns an array of integers with the tags', function() {
      var buf = new Buffer([0x9f, 0x70, 0x80, 0xA0, 0x9f, 0x80, 0x7f, 0x81]);
      var tag = tlv.parseAllTags(buf);
      
      tag[0].should.equal(0x9f70);   
      tag[1].should.equal(0x80);
      tag[2].should.equal(0xA0);
      tag[3].should.equal(0x9f807f);
      tag[4].should.equal(0x81);
    });
  });
  
  describe('#encodeTags', function() {
    it('should return a new buffer containing the encoded form the given array of tags', function() {
      var tags = [0x9f70, 0x80, 0xA0, 0x9f807f];
      var buf = tlv.encodeTags(tags);
      buf.should.deep.equal(new Buffer([0x9f, 0x70, 0x80, 0xA0, 0x9f, 0x80, 0x7f]));
    });
  });
  
  describe('#getUIntValue', function() {
    it('should return an unsigned big endian integer from a 1 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff]));
      intTlv.getUIntValue().should.equal(255);
    });
    
    it('should return an unsigned big endian integer from a 2 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff, 0xff]));
      intTlv.getUIntValue().should.equal(65535);
    });
    
    it('should return an unsigned big endian integer from a 3 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff, 0xff, 0xff]));
      intTlv.getUIntValue().should.equal(16777215);
    });
    
    it('should return an unsigned big endian integer from a 4 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff, 0xff, 0xff, 0xff]));
      intTlv.getUIntValue().should.equal(4294967295);
      
      intTlv = new TLV(0x80, new Buffer([0xde, 0xad, 0xbe, 0xef]));
      intTlv.getUIntValue().should.equal(3735928559);
    });
  });
  
  describe('#getIntValue', function() {
    it('should return an signed big endian integer from a 1 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff]));
      intTlv.getIntValue().should.equal(-1);
      
      intTlv = new TLV(0x80, new Buffer([0x7f]));
      intTlv.getIntValue().should.equal(127);
    });
    
    it('should return an signed big endian integer from a 2 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff, 0xff]));
      intTlv.getIntValue().should.equal(-1);
      
      intTlv = new TLV(0x80, new Buffer([0x7f, 0xff]));
      intTlv.getIntValue().should.equal(32767);
    });
    
    it('should return an signed big endian integer from a 3 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff, 0xff, 0xff]));
      intTlv.getIntValue().should.equal(-1);
      
      intTlv = new TLV(0x80, new Buffer([0x7f, 0xff, 0xff]));
      intTlv.getIntValue().should.equal(8388607);
    });
    
    it('should return an signed big endian integer from a 4 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer([0xff, 0xff, 0xff, 0xff]));
      intTlv.getIntValue().should.equal(-1);
      
      intTlv = new TLV(0x80, new Buffer([0x5e, 0xad, 0xbe, 0xef]));
      intTlv.getIntValue().should.equal(1588444911);
    });
  });
  
  describe('#setIntValue', function() {
    it('should write a big endian integer in a 1 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer(1));
      intTlv.setIntValue(255);
      intTlv.value.should.deep.equal(new Buffer([0xff]));
      
      intTlv.setIntValue(-1);
      intTlv.value.should.deep.equal(new Buffer([0xff]));
      
      intTlv.setIntValue(127);
      intTlv.value.should.deep.equal(new Buffer([0x7f]));
    });
    
    it('should write a big endian integer in a 2 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer(2));
      intTlv.setIntValue(65535);
      intTlv.value.should.deep.equal(new Buffer([0xff, 0xff]));
      
      intTlv.setIntValue(-1);
      intTlv.value.should.deep.equal(new Buffer([0xff, 0xff]));
      
      intTlv.setIntValue(32767);
      intTlv.value.should.deep.equal(new Buffer([0x7f, 0xff]));
    });
    
    it('should write a big endian integer in a 3 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer(3));
      intTlv.setIntValue(16777215);
      intTlv.value.should.deep.equal(new Buffer([0xff, 0xff, 0xff]));
      
      intTlv.setIntValue(-1);
      intTlv.value.should.deep.equal(new Buffer([0xff, 0xff, 0xff]));
      
      intTlv.setIntValue(8388607);
      intTlv.value.should.deep.equal(new Buffer([0x7f, 0xff, 0xff]));
    });
    
    it('should write a big endian integer in a 4 byte buffer', function() {
      var intTlv = new TLV(0x80, new Buffer(4));
      intTlv.setIntValue(4294967295);
      intTlv.value.should.deep.equal(new Buffer([0xff, 0xff, 0xff, 0xff]));
      
      intTlv.setIntValue(-1);
      intTlv.value.should.deep.equal(new Buffer([0xff, 0xff, 0xff, 0xff]));
      
      intTlv.setIntValue(2147483647);
      intTlv.value.should.deep.equal(new Buffer([0x7f, 0xff, 0xff, 0xff]));
    });
  });
  
});