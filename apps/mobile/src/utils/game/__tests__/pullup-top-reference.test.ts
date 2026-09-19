import {strict as assert} from 'node:assert';
import {SCRIPT_FORM_TRACKING} from '../html/scriptFormTracking';

type Metrics = ReturnType<typeof metrics>;
type Point = {x:number;y:number;visibility:number};
type TopHarness = {
  update:(metrics:Metrics,now:number)=>void;
  check:(metrics:Metrics)=>boolean;
  reference:()=>{shoulderY:number}|null;
  pose:(points:Point[],now:number)=>void;
  poseValid:()=>boolean;
};
// Isolate the top-reference rule. Floor observation and the actual calibration
// loop have separate integration suites; this harness never invents a floor.
function tracker(): TopHarness {
  return new Function('CONFIG', SCRIPT_FORM_TRACKING +
    ';return {update:observePullupStartReference,check:pullupTopPoseValid,'+
    'reference:()=>pullupStartReference,pose:function(points,now){'+
    'formPoseLandmarks=points;formCurrentMetrics=collectExperimentalFormMetrics();'+
    'observePullupStartReference(formCurrentMetrics,now);},'+
    'poseValid:()=>pullupTopPoseValid(formCurrentMetrics)};')({exercise:'pullups',trackingMode:'form-test'}) as TopHarness;
}
function metrics(shoulderY = 0.44, wristY = 0.31, span = 0.25, angle = 115) {
  const m = {
    shoulders: {x:0.5,y:shoulderY}, eyes:{x:0.5,y:shoulderY-0.06},
    leftEye:{x:0.48,y:shoulderY-0.06},rightEye:{x:0.52,y:shoulderY-0.06},
    leftShoulder:{x:0.43,y:shoulderY},rightShoulder:{x:0.57,y:shoulderY},
    leftElbow:{x:0.38,y:shoulderY-0.06},rightElbow:{x:0.62,y:shoulderY-0.06},
    leftWrist:{x:0.5-span/2,y:wristY},rightWrist:{x:0.5+span/2,y:wristY},
    wrists:{x:0.5,y:wristY},leftElbowAngle:angle,rightElbowAngle:angle,
  };
  return m;
}

function hold(h:TopHarness,m:Metrics,from=1000,to=2000) {for(let t=from;t<=to;t+=50)h.update(m,t);}
it('comfortable bent starting arms establish reference',()=>{
  const h=tracker();hold(h,metrics(0.44,0.31,0.25,105));assert(h.reference());
  assert(h.check(metrics(0.365,0.31,0.25,65)));
});
it('a fresh 5fps camera can establish a starting reference',()=>{
  const h=tracker();for(let t=1000;t<=2000;t+=200)h.update(metrics(),t);
  assert(h.reference());assert(h.check(metrics(0.365,0.31,0.25,65)));
});
it('a fresh 4fps camera can establish a starting reference',()=>{
  const h=tracker();for(let t=1000;t<=2250;t+=250)h.update(metrics(),t);
  assert(h.reference());assert(h.check(metrics(0.365,0.31,0.25,65)));
});
it('a fresh 2fps camera can establish a starting reference',()=>{
  const h=tracker();for(let t=1000;t<=3500;t+=500)h.update(metrics(),t);
  assert(h.reference());assert(h.check(metrics(0.365,0.31,0.25,65)));
});
it('widening grip cannot replace body rise',()=>{
  const h=tracker();hold(h,metrics());hold(h,metrics(0.44,0.39,0.40,40),2050,4000);
  assert.equal(h.check(metrics(0.44,0.39,0.40,40)),false);
});
it('legitimate widened grip with actual body rise is accepted',()=>{
  const h=tracker();hold(h,metrics());hold(h,metrics(0.44,0.31,0.40),2050,3000);
  assert(h.check(metrics(0.365,0.31,0.40,65)));
});
it('a narrow neutral grip with actual body rise is accepted',()=>{
  const h=tracker();hold(h,metrics(0.44,0.31,0.02));
  assert(h.reference());assert(h.check(metrics(0.365,0.31,0.02,65)));
});
it('a narrow neutral grip without body rise is rejected',()=>{
  const h=tracker();hold(h,metrics(0.44,0.31,0.02));
  assert.equal(h.check(metrics(0.44,0.39,0.02,40)),false);
});
it('head-only motion is rejected',()=>{
  const h=tracker();hold(h,metrics());const p=metrics();p.leftEye.y=p.rightEye.y=p.eyes.y=0.30;
  assert.equal(h.check(p),false);
});
it('a single lower-shoulder outlier does not replace valid top-position context',()=>{
  const h=tracker();hold(h,metrics(0.365,0.31,0.25,65),1000,2000);h.update(metrics(0.44),2050);
  hold(h,metrics(0.365,0.31,0.25,65),2100,4000);
  assert.equal(h.reference(),null);
  assert.equal(h.check(metrics(0.365,0.31,0.25,65)),true);
});
it('single-side shoulder estimate cannot count as bilateral rise',()=>{
  const h=tracker();hold(h,metrics());const p=metrics(0.365,0.31,0.25,65);p.rightShoulder.y=0.44;
  assert.equal(h.check(p),false);
});
it('moving continuously from stable hang to held top keeps fixed reference',()=>{
  const h=tracker();hold(h,metrics());for(let t=2050;t<=3000;t+=50)h.update(metrics(0.44-0.075*(t-2000)/1000,0.31,0.25,65),t);
  hold(h,metrics(0.365,0.31,0.25,65),3050,5000);assert(h.check(metrics(0.365,0.31,0.25,65)));
});
it('very slow continuous pull cannot walk the starting reference upward',()=>{
  const h=tracker();hold(h,metrics());const initial=h.reference();assert(initial);
  for(let t=2050;t<=12000;t+=50)h.update(metrics(0.44-0.075*(t-2000)/10000,0.31,0.25,65),t);
  assert.equal(h.reference()?.shoulderY,initial.shoulderY);
  assert(h.check(metrics(0.365,0.31,0.25,65)));
});
it('a valid top pose does not require any preceding hang or movement observation',()=>{
  const h=tracker();assert.equal(h.reference(),null);
  assert.equal(h.check(metrics(0.365,0.31,0.25,65)),true);
});
it('a higher grip still requires the eyes at that higher bar',()=>{
  const h=tracker();hold(h,metrics());
  assert.equal(h.check(metrics(0.365,0.20,0.25,65)),false);
  assert.equal(h.check(metrics(0.255,0.20,0.25,65)),true);
});

// Compact recorded endpoint geometries, not a claim to replay full sessions.
// Full timestamped device replays are retained in the investigation artifacts.
const deviceEndpoints = [
  {
    "id": "1789673008978-032236",
    "accepted": false,
    "starting": [
      [
        2,
        0.5369,
        0.3747,
        1
      ],
      [
        5,
        0.5086,
        0.3747,
        1
      ],
      [
        11,
        0.5913,
        0.4344,
        0.998
      ],
      [
        12,
        0.4596,
        0.4338,
        0.998
      ],
      [
        13,
        0.6793,
        0.3884,
        0.992
      ],
      [
        14,
        0.3855,
        0.3959,
        0.984
      ],
      [
        15,
        0.6863,
        0.2935,
        0.981
      ],
      [
        16,
        0.3576,
        0.3455,
        0.966
      ]
    ],
    "ending": [
      [
        2,
        0.5376,
        0.3662,
        1
      ],
      [
        5,
        0.5082,
        0.3659,
        1
      ],
      [
        11,
        0.5906,
        0.4291,
        0.998
      ],
      [
        12,
        0.4545,
        0.4262,
        0.998
      ],
      [
        13,
        0.6806,
        0.4005,
        0.994
      ],
      [
        14,
        0.3689,
        0.4051,
        0.985
      ],
      [
        15,
        0.6429,
        0.4017,
        0.976
      ],
      [
        16,
        0.3699,
        0.3862,
        0.949
      ]
    ]
  },
  {
    "id": "1789673030761-568610",
    "accepted": false,
    "starting": [
      [
        2,
        0.5233,
        0.382,
        1
      ],
      [
        5,
        0.4987,
        0.3818,
        1
      ],
      [
        11,
        0.5656,
        0.4403,
        0.999
      ],
      [
        12,
        0.4459,
        0.4363,
        0.999
      ],
      [
        13,
        0.6496,
        0.3995,
        0.99
      ],
      [
        14,
        0.3918,
        0.3873,
        0.99
      ],
      [
        15,
        0.6588,
        0.3156,
        0.981
      ],
      [
        16,
        0.4118,
        0.31,
        0.976
      ]
    ],
    "ending": [
      [
        2,
        0.5375,
        0.3723,
        1
      ],
      [
        5,
        0.5081,
        0.3711,
        1
      ],
      [
        11,
        0.5876,
        0.4324,
        0.998
      ],
      [
        12,
        0.4571,
        0.432,
        0.997
      ],
      [
        13,
        0.6781,
        0.4042,
        0.995
      ],
      [
        14,
        0.3732,
        0.406,
        0.987
      ],
      [
        15,
        0.6487,
        0.3982,
        0.98
      ],
      [
        16,
        0.3534,
        0.3538,
        0.962
      ]
    ]
  },
  {
    "id": "1789673195521-118848",
    "accepted": false,
    "starting": [
      [
        2,
        0.5505,
        0.4116,
        1
      ],
      [
        5,
        0.522,
        0.4092,
        1
      ],
      [
        11,
        0.599,
        0.4675,
        0.999
      ],
      [
        12,
        0.4659,
        0.4601,
        0.998
      ],
      [
        13,
        0.6743,
        0.3979,
        0.975
      ],
      [
        14,
        0.3903,
        0.3923,
        0.976
      ],
      [
        15,
        0.6851,
        0.3023,
        0.933
      ],
      [
        16,
        0.367,
        0.3316,
        0.918
      ]
    ],
    "ending": [
      [
        2,
        0.5475,
        0.3887,
        0.998
      ],
      [
        5,
        0.5148,
        0.3886,
        0.999
      ],
      [
        11,
        0.6045,
        0.4524,
        0.999
      ],
      [
        12,
        0.4587,
        0.4507,
        0.998
      ],
      [
        13,
        0.6911,
        0.4048,
        0.985
      ],
      [
        14,
        0.3725,
        0.3989,
        0.984
      ],
      [
        15,
        0.629,
        0.4213,
        0.584
      ],
      [
        16,
        0.3993,
        0.4022,
        0.56
      ]
    ]
  },
  {
    "id": "1789673384644-607392",
    "accepted": false,
    "starting": [
      [
        2,
        0.5286,
        0.3696,
        1
      ],
      [
        5,
        0.5003,
        0.3707,
        1
      ],
      [
        11,
        0.5835,
        0.4365,
        1
      ],
      [
        12,
        0.4574,
        0.4331,
        1
      ],
      [
        13,
        0.6775,
        0.4061,
        0.994
      ],
      [
        14,
        0.3797,
        0.4122,
        0.995
      ],
      [
        15,
        0.676,
        0.3245,
        0.99
      ],
      [
        16,
        0.3906,
        0.341,
        0.992
      ]
    ],
    "ending": [
      [
        2,
        0.5448,
        0.3609,
        1
      ],
      [
        5,
        0.5149,
        0.3604,
        1
      ],
      [
        11,
        0.6012,
        0.4234,
        0.999
      ],
      [
        12,
        0.4618,
        0.4229,
        0.998
      ],
      [
        13,
        0.6937,
        0.3972,
        0.996
      ],
      [
        14,
        0.3742,
        0.4036,
        0.989
      ],
      [
        15,
        0.6351,
        0.4134,
        0.981
      ],
      [
        16,
        0.3813,
        0.3889,
        0.96
      ]
    ]
  },
  {
    "id": "1789673255404-780287",
    "accepted": true,
    "starting": [
      [
        2,
        0.5296,
        0.3811,
        1
      ],
      [
        5,
        0.5075,
        0.38,
        1
      ],
      [
        11,
        0.5736,
        0.4401,
        0.999
      ],
      [
        12,
        0.4564,
        0.4319,
        0.999
      ],
      [
        13,
        0.6627,
        0.3889,
        0.99
      ],
      [
        14,
        0.3935,
        0.3771,
        0.989
      ],
      [
        15,
        0.6691,
        0.3136,
        0.98
      ],
      [
        16,
        0.4105,
        0.3048,
        0.969
      ]
    ],
    "ending": [
      [
        2,
        0.5482,
        0.3029,
        0.999
      ],
      [
        5,
        0.5246,
        0.302,
        0.999
      ],
      [
        11,
        0.6021,
        0.3583,
        1
      ],
      [
        12,
        0.464,
        0.3629,
        1
      ],
      [
        13,
        0.6865,
        0.39,
        0.989
      ],
      [
        14,
        0.3913,
        0.3932,
        0.989
      ],
      [
        15,
        0.68,
        0.3266,
        0.984
      ],
      [
        16,
        0.4001,
        0.3267,
        0.976
      ]
    ]
  }
];
function endpointPoints(rows:number[][]):Point[] {
  const points=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
  for(const [index,x,y,visibility] of rows)points[index]={x,y,visibility};
  return points;
}
it.each(deviceEndpoints)('checks recorded endpoint geometry $id (body rise=$accepted)',fixture=>{
  const h=tracker(),start=endpointPoints(fixture.starting),end=endpointPoints(fixture.ending);
  for(let now=1000;now<=2000;now+=50)h.pose(start,now);
  h.pose(end,2050);
  expect(h.poseValid()).toBe(fixture.accepted);
});

