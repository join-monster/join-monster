import {graphql} from 'graphql';
import schemaBasic from '../test-api/schema-basic/index';
import {partial} from 'lodash';
import {errCheck} from './helpers/_util';

const run = partial(graphql, schemaBasic);

test('it should handle duplicate scalar field', async () => {
  const query = `{
    user(id: 1) {
      fullName
      fullName
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'andrew carlson',
    },
  };
  expect(expected).toEqual(data);
});

test('it should handle duplicate object type field', async () => {
  const query = `{
    user(id: 1) {
      posts {
        body
        authorId
      }
      posts {
        authorId
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      posts: [
        {
          body: 'Check out this cool new GraphQL library, Join Monster.',
          authorId: 1,
        },
      ],
    },
  };
  expect(expected).toEqual(data);
});

test.skip('it should handle duplicate object type fields with different arguments', async () => {
  const query = `{
      user(id: 3) {
        comments: comments(active: true) {
          id
        }
        archivedComments: comments(active: false) {
          id
        }
      }
    }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      comments: [{id: 3}, {id: 5}, {id: 9}],
      archivedComments: [{id: 2}, {id: 3}, {id: 5}, {id: 9}],
    },
  };
  expect(expected).toEqual(data);
});

test('it should handle duplicate of a field off the query root', async () => {
  const query = `{
    user(id: 1) {
      fullName
    }
    user(id: 1) {
      email
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    fullName: 'andrew carlson',
    email: 'andrew@stem.is',
  };
  expect(expected).toEqual(data.user);
});

test('it should handle duplicate of a field off the query root with aliases', async () => {
  const query = `{
    thing1: user(id: 1) {
      fullName
    }
    thing2: user(id: 1) {
      email
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    thing1: {
      fullName: 'andrew carlson',
    },
    thing2: {
      email: 'andrew@stem.is',
    },
  };
  expect(expected).toEqual(data);
});

test('it should handle duplicate of a field recursively', async () => {
  const query = `{
    user(id: 2) {
      fullName
      posts {
        id
        comments {
          authorId
          bdy: body
        }
      }
      posts {
        authorId
        comments {
          body
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    fullName: 'matt elder',
    posts: [
      {
        id: 1,
        comments: [
          {
            authorId: 3,
            bdy: "That's ultra weird bro.",
            body: "That's ultra weird bro.",
          },
          {
            authorId: 3,
            bdy: "That's super weird dude.",
            body: "That's super weird dude.",
          },
          {
            authorId: 1,
            bdy: 'Wow this is a great post, Matt.',
            body: 'Wow this is a great post, Matt.',
          },
        ],
        authorId: 2,
      },
      {
        id: 3,
        comments: [
          {
            authorId: 3,
            bdy: 'Yeah well Java 8 added lambdas.',
            body: 'Yeah well Java 8 added lambdas.',
          },
        ],
        authorId: 2,
      },
    ],
  };
  expect(expected).toEqual(data.user);
});
