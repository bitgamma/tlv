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
  var chai = require('chai').should();
  var tlv = require('../lib/tlv');
  var TLV = tlv.TLV;
  
  describe('#parse', function() {
    it('should return a TLV object when provided a buffer with primitive tag on 1 byte and length on 1 byte.', function() {
      var buf = new Buffer([0x80, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]);
      var res = tlv.parse(buf);
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x80);
      res.constructed.should.equal(false);
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
      res.originalLength.should.equal(2);
      res.value.should.deep.equal([]);
    });
    
    it('should return a TLV object when provided a buffer with constructed tlvs with 2 levels of nesting', function() {
      var res = tlv.parse(new Buffer([0xE1, 0x0C, 0xA0, 0x04, 0x82, 0x02, 0xCA, 0xFE, 0x00, 0x00, 0x83, 0x02, 0xBB, 0xBC]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0xE1);
      res.constructed.should.equal(true);
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
      res.originalLength.should.equal(8);
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 3 bytes and length on 2 bytes.', function() {
      var res = tlv.parse(new Buffer([0x9F, 0x85, 0x22, 0x81, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x9F8522);
      res.constructed.should.equal(false);
      res.originalLength.should.equal(9);
      res.value.should.deep.equal(new Buffer([0xCA, 0xFE, 0xBA, 0xBE]));
    });
    
    it('should return a TLV object when provided a buffer with primitive tag on 4 bytes and length on 2 bytes.', function() {
      var res = tlv.parse(new Buffer([0x1F, 0x85, 0xA2, 0x01, 0x81, 0x04, 0xCA, 0xFE, 0xBA, 0xBE]));
      
      res.should.be.an.instanceof(TLV);
      res.tag.should.equal(0x1F85A201);
      res.constructed.should.equal(false);
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
      res.originalLength.should.equal(12);
      res.value.should.deep.equal([
        new TLV(0x81, new Buffer([0x00, 0x00]), 4),
        new TLV(0x82, new Buffer([0xBB, 0xBC]), 4)
      ]);
    });
    
    it('should throw an exception when provided a buffer with primitive tag and indefinite length.', function() {
      var buf = new Buffer([0xC0, 0x80, 0x81, 0x01, 0x00, 0x00, 0x00]);
      (function(){ tlv.parse(buf); }).should.throw(Error);
    });
  });
});