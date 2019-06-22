import {graphql} from 'graphql';
import schemaBasic from '../test-api/schema-basic/index';
import {partial} from 'lodash';
import {errCheck} from './helpers/_util';

const run = partial(graphql, schemaBasic);

test('it should a union type', async () => {
  const query = `
    {
      user(id: 1) {
        writtenMaterial1 {
          __typename
          ... on Comment {
            id
            body
            postId
            authorId
            likers {
              fullName
            }
          }
          ...postInfo
        }
      }
    }

    fragment postInfo on Post {
      id
      body
      authorId
    }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      writtenMaterial1: [
        {
          __typename: 'Comment',
          id: 1,
          body: 'Wow this is a great post, Matt.',
          postId: 1,
          authorId: 1,
          likers: [{fullName: 'matt elder'}],
        },
        {
          id: 2,
          __typename: 'Post',
          authorId: 1,
          body: 'Check out this cool new GraphQL library, Join Monster.',
        },
        {
          __typename: 'Comment',
          id: 4,
          body: 'Do not forget to check out the demo.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 8,
          body:
            'Somebody please help me with this library. It is so much work.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
      ],
    },
  };
  expect(expected).toEqual(data);
});

test('it should an interface type', async () => {
  const query = `
    {
      user(id: 1) {
        writtenMaterial2 {
          __typename
          id
          body
          authorId
          ... on Comment {
            postId
            likers {
              fullName
            }
          }
        }
      }
    }
  `;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      writtenMaterial2: [
        {
          __typename: 'Comment',
          id: 1,
          body: 'Wow this is a great post, Matt.',
          postId: 1,
          authorId: 1,
          likers: [{fullName: 'matt elder'}],
        },
        {
          id: 2,
          __typename: 'Post',
          authorId: 1,
          body: 'Check out this cool new GraphQL library, Join Monster.',
        },
        {
          __typename: 'Comment',
          id: 4,
          body: 'Do not forget to check out the demo.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 6,
          body: 'Also, submit a PR if you have a feature you want to add.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
        {
          __typename: 'Comment',
          id: 8,
          body:
            'Somebody please help me with this library. It is so much work.',
          authorId: 1,
          postId: 2,
          likers: [],
        },
      ],
    },
  };
  expect(expected).toEqual(data);
});
