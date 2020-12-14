const express=require('express');
const app=express();
const request=require('request');
const isURL = require('isurl');

var base62=require('base62');
var path=require('path');
var elasicsearch=require('elasticsearch');


const { url } = require('inspector');

const INDEX_NAME='s_urls';
const BASE_URL='http://localhost:3000/';

//use elasticsearch
var client = new elasicsearch.Client({
    host:'localhost:9200',
    log:'trace',
    apiVersion:'7.2'
});


app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use('/node_modules',express.static(path.join(__dirname+'/node_modules')))

app.use(express.static(__dirname + '/public'));


app.set('view engine','ejs');//사용하는 뷰 엔진
app.set('views',__dirname+'/views');//렌더링할 파일이 있는 디렉토리


//http처리
function add_Http(url){
  if (url.substring(0,7)!=='http://'){
    url='http://'+url;
    
    return url;
  }else{
    return url
  }
}


function url_to_base62(param){


  var n=param.length;
  var ascii=0;

  for(i=0;i<n;i++){
      ascii+=param.charCodeAt(i)*(i+1);
  }
  
  return [ascii,base62.encode(ascii)];

}


app.get('/index',function(req,res){
    res.render('index');
});


//redirection
app.get('/:url',(req,res)=>{
  var encodedUrl=req.params.url
  var decodeId=base62.decode(encodedUrl)
  
  async function run () {
       
    const { body } = await client.getSource({
      index: INDEX_NAME,
      id:decodeId
    },(err,result)=>{
      if(err){
        res.status(404);
      }
      else{
        
        res.redirect(result.url);
      }

    })

  }
  run().catch();
  
})


app.post('/urlhandler',async(req,res)=>{

    var getUrl=req.body.URL;
    getUrl=add_Http(getUrl);

    

    var encodeSet=url_to_base62(getUrl);
    var encodeUrl=encodeSet[1];
    var encodeId=encodeSet[0];

    //elasticsearch ping
    client.ping({
        // ping usually has a 3000ms timeout
        requestTimeout: 1000
      }, function (error) {
        if (error) {
          console.trace('elasticsearch cluster is down!');
        } else {
          console.log('All is well');
        }
      });
      async function run () {
       
        const { body } = await client.getSource({
          index: INDEX_NAME,
          id:encodeId
        },(err,result)=>{
          if(err){
           
            var shortenUrl=BASE_URL+encodeUrl;

            const {body}=client.index({
              index:INDEX_NAME,
              id:encodeId,
              body:{
                url:getUrl,
                shortenUrl:shortenUrl
              }
            })
            res.json(shortenUrl)
          }
          else{
            
            res.json(result.shortenUrl);
          }

        })
     
      }

      run().catch()
    
})



app.listen(3000,function(){
    console.log('서버가 3000번 포트에서 실행중 입니다');
})

