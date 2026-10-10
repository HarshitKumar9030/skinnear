"""Opt-in live AI smoke check using a synthetic routine; never sends selfies/health data."""
import argparse
import base64
import http.cookiejar
import json
import urllib.request


class AiSmokeCheck:
    def __init__(self, origin):
        self.origin=origin.rstrip('/')
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def post(self,path,body):
        request=urllib.request.Request(self.origin+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Origin':self.origin})
        return self.opener.open(request,timeout=90)

    def run(self):
        request={'analysis':{'mode':'demo','scores':[{'concern':'moisture','score':50}]},'preferences':{'budget':2500,'country':'IN','currency':'INR','city':'Test city','pincode':'','sensitive':False,'fragranceFree':True,'exclusions':[],'ownedCategories':[]},'excludedProductIds':[]}
        with self.post('/api/routine',request) as response:
            routine=json.load(response)
        assert routine['feasible'] and routine['total']<=2500
        snapshot={'version':1,'kind':'routine','currency':'INR','budget':2500,'items':[{'id':item['product']['id'],'price':item['product']['referencePrice']} for item in routine['items']]}
        encoded=base64.urlsafe_b64encode(json.dumps(snapshot).encode()).decode().rstrip('=')
        with self.post('/api/routine/explain',{'plan':encoded,'consent':True}) as response:
            explanation=json.load(response)
        assert {x['id'] for x in explanation['steps']}=={x['id'] for x in snapshot['items']}
        print(f'Live explanation: {len(explanation["steps"])} grounded steps; budget preserved',flush=True)
        with self.post('/api/routine/voice',{'token':explanation['narrationToken'],'consent':True}) as response:
            audio=response.read()
            assert response.headers['Content-Type']=='audio/wav'
        assert audio[:4]==b'RIFF' and audio[8:12]==b'WAVE'
        print(f'Live voice: valid WAV, {len(audio)} bytes',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--live',action='store_true',required=True,help='Explicitly allow paid Gemini requests')
    parser.add_argument('--origin',default='http://127.0.0.1:3000')
    AiSmokeCheck(parser.parse_args().origin).run()
