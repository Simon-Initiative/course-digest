import { guid } from '../utils/common';

export function convertImageCodingActivities($: any, found: any) : string {

  $('code').each((i: any, item: any) => {  
    const content = $(item).html();
    if (content.indexOf('image-coding') >= 0 && content.indexOf('xblock') >= 0) {
      const activity = convertXBlock($, item);
      replaceWithReference($, item, activity);
      found.push(activity);

    } else if (content.indexOf('textarea') >= 0 && content.indexOf('evaluate') >= 0) {
      const activity = convertExample($, item);
      replaceWithReference($, item, activity);
      found.push(activity);
    }
  });
  
  return $.html();

}

function convertXBlock($: any, item: any) {

  const content : any = defaultContent();
  const cl = (text: string) => ({
    "type": "code_line",
    "id": guid(),
    "children": [
      {
        "text": text
      }
    ]
  });
  content.stem = {
    id: guid(),
    content: {
      model: [
        { id: guid(), type: 'p', children: [{ text: 'This was a converted image coding exercise' }]}, 
        { id: guid(), type: 'code', children: [], language: 'xml' },
        { id: guid(), type: 'p', children: [{ text: ' ' }]}
      ]
    }
  };

  $(item).children('code_line').each((i: any, c: any) => {
    content.stem.content.model[1].children.push(cl($(c).text()));
  });
  return toActivity(content);
}

function convertExample($: any, item: any) {
  return convertXBlock($, item);
}

function defaultContent() {
  return {
    "authoring": {
      "parts": [
        {
          "id": "1",
          "responses": [
            {
              "id": "3713976972",
              "score": 1,
              "rule": "input like {1}",
              "feedback": {
                "id": "2848932877",
                "content": {
                  "id": "2564146359",
                  "model": [
                    {
                      "type": "p",
                      "children": [
                        {
                          "text": "Correct"
                        }
                      ]
                    }
                  ]
                }
              }
            },
            {
              "id": "1922898198",
              "score": 0,
              "rule": "input like {.*}",
              "feedback": {
                "id": "767434587",
                "content": {
                  "id": "4080440981",
                  "model": [
                    {
                      "type": "p",
                      "children": [
                        {
                          "text": "Incorrect."
                        }
                      ]
                    }
                  ]
                }
              }
            }
          ],
          "hints": [
            {
              "id": "2862983244",
              "content": {
                "id": "863806719",
                "model": [
                  {
                    "type": "p",
                    "children": [
                      {
                        "text": " "
                      }
                    ]
                  }
                ]
              }
            },
            {
              "id": "2486288423",
              "content": {
                "id": "887418037",
                "model": [
                  {
                    "type": "p",
                    "children": [
                      {
                        "text": " "
                      }
                    ]
                  }
                ]
              }
            },
            {
              "id": "811063065",
              "content": {
                "id": "923739514",
                "model": [
                  {
                    "type": "p",
                    "children": [
                      {
                        "text": " "
                      }
                    ]
                  }
                ]
              }
            }
          ],
          "scoringStrategy": "average"
        }
      ],
      "transformations": [],
      "previewText": ""
    }
  };
}

function toActivity(content: any) {

  const id = guid();

  return {
    type: 'Activity',
    id,
    originalFile: '',
    title: 'Image coding activity',
    tags: [],
    unresolvedReferences: [],
    content,
    objectives: [],
    legacyId: id,
    subType: 'oli_short_answer',
  };
}

function replaceWithReference($: any, item: any, activity: any) {
  $(item).replaceWith(`<activity_placeholder idref="${activity.id}"></activity_placeholder>`);
}