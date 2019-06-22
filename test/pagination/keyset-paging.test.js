import {graphql} from 'graphql';
import schemaRelay from '../../test-api/schema-paginated/index';
import {partial} from 'lodash';
import {toGlobalId, fromGlobalId} from 'graphql-relay';
import {objToCursor} from '../../src/util';
import {errCheck} from '../helpers/_util';

// monkey-patch the array prototype because these are tests and IDGAF
Object.defineProperty(Array.prototype, 'last', {
  value: function() {
    return this[this.length - 1];
  },
  enumberable: false,
});

const run = partial(graphql, schemaRelay);

function stringifyArgs(args) {
  if (!args) {
    return '';
  }
  const argArr = [];
  for (let name in args) {
    argArr.push(`${name}: ${JSON.stringify(args[name])}`);
  }
  return `(${argArr.join(', ')})`;
}

const pageInfo =
  'pageInfo { hasNextPage, hasPreviousPage, startCursor, endCursor }';

function makeUsersQuery(args) {
  let argString = stringifyArgs(args);
  return `{
    users${argString} {
      ${pageInfo}
      edges {
        cursor
        node { id, fullName, email }
      }
    }
  }`;
}

test('should handle pagination at the root', async () => {
  const query = makeUsersQuery();
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({id: 1}),
    endCursor: objToCursor({id: 6}),
  });
  // generate globalIds for users 1 thru 5
  const expectedIds = Array.apply(null, Array(6)).map((_, i) =>
    toGlobalId('User', i + 1)
  );
  const ids = data.users.edges.map((edge) => edge.node.id);
  expect(expectedIds).toEqual(ids);
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should handle root pagination with "first" arg', async () => {
  const query = makeUsersQuery({first: 2});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: objToCursor({id: 1}),
    endCursor: objToCursor({id: 2}),
  });
  expect(data.users.edges[0]).toEqual({
    cursor: objToCursor({id: 1}),
    node: {
      id: toGlobalId('User', 1),
      fullName: 'Alivia Waelchi',
      email: 'Mohammed.Hayes@hotmail.com',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should reject an invalid cursor', async () => {
  const query = makeUsersQuery({
    first: 2,
    after: objToCursor({id: 2, created_at: '2016-01-01'}),
  });
  const {errors} = await run(query);
  expect(errors.length).toBeTruthy();
  expect(errors[0] && errors[0].message).toMatch(
    /Invalid cursor. The column "created_at" is not in the sort key./
  );
});

test('should handle root pagination with "first" and "after" args', async () => {
  const query = makeUsersQuery({first: 2, after: objToCursor({id: 2})});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: objToCursor({id: 3}),
    endCursor: objToCursor({id: 4}),
  });
  expect(data.users.edges[0]).toEqual({
    cursor: objToCursor({id: 3}),
    node: {
      id: toGlobalId('User', 3),
      fullName: 'Coleman Abernathy',
      email: 'Lurline79@gmail.com',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should handle the last page of root pagination', async () => {
  const query = makeUsersQuery({first: 2, after: objToCursor({id: 5})});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({id: 6}),
    endCursor: objToCursor({id: 6}),
  });
  expect(data.users.edges.length).toBe(1);
  expect(data.users.edges[0]).toEqual({
    cursor: objToCursor({id: 6}),
    node: {
      id: toGlobalId('User', 6),
      email: 'andrew@stem.is',
      fullName: 'Andrew Carlson',
    },
  });
  expect(data.users.edges.last().cursor).toBe(data.users.pageInfo.endCursor);
});

test('should return nothing after the end of root pagination', async () => {
  const query = makeUsersQuery({first: 3, after: objToCursor({id: 6})});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users).toEqual({
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    edges: [],
  });
});

test('should handle backward pagination at root with "last" arg', async () => {
  const query = makeUsersQuery({last: 2});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: true,
    startCursor: objToCursor({id: 5}),
    endCursor: objToCursor({id: 6}),
  });
  expect(data.users.edges[0].node.id).toBe(toGlobalId('User', 5));
  expect(data.users.edges[1].node.id).toBe(toGlobalId('User', 6));
});

test('should handle backward pagination at root with "last" and "before" args', async () => {
  const query = makeUsersQuery({last: 1, before: objToCursor({id: 2})});
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({id: 1}),
    endCursor: objToCursor({id: 1}),
  });
  expect(data.users.edges.length).toBe(1);
});

function makePostsQuery(args) {
  let argString = stringifyArgs(args);
  return `{
    user(id: 1) {
      posts${argString} {
        ${pageInfo}
        edges {
          cursor
          node { id, body }
        }
      }
    }
  }`;
}

test('should handle pagination in a nested field', async () => {
  const query = makePostsQuery();
  const {data, errors} = await run(query);
  errCheck(errors);
  const posts = data.user.posts;
  expect(posts.pageInfo).toEqual({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({created_at: '2016-04-17T18:49:15.942Z', id: 2}),
    endCursor: objToCursor({created_at: '2015-11-15T08:26:11.331Z', id: 30}),
  });
  expect(posts.edges.length).toBe(8);
  expect(posts.edges[0]).toEqual({
    cursor: objToCursor({created_at: '2016-04-17T18:49:15.942Z', id: 2}),
    node: {
      id: toGlobalId('Post', 2),
      body: [
        'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
        'Deserunt nemo pariatur sed facere accusantium quis.',
        'Nobis aut voluptate inventore quidem explicabo.',
      ].join(' '),
    },
  });
  expect(posts.edges.last().cursor).toBe(posts.pageInfo.endCursor);
});

test('nested paging should handle "first" arg', async () => {
  const query = makePostsQuery({first: 3});
  const {data, errors} = await run(query);
  errCheck(errors);
  const posts = data.user.posts;
  expect(posts.pageInfo).toEqual({
    hasNextPage: true,
    hasPreviousPage: false,
    startCursor: objToCursor({created_at: '2016-04-17T18:49:15.942Z', id: 2}),
    endCursor: objToCursor({created_at: '2016-04-13T15:07:15.119Z', id: 33}),
  });
  expect(posts.edges.length).toBe(3);
  expect(posts.edges.last().cursor).toBe(posts.pageInfo.endCursor);
});

test('nested paging should handle "last" and "before" args', async () => {
  const query = makePostsQuery({
    last: 2,
    before: objToCursor({created_at: '2016-04-13T15:07:15.119Z', id: 33}),
  });
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: objToCursor({created_at: '2016-04-17T18:49:15.942Z', id: 2}),
    endCursor: objToCursor({created_at: '2016-04-15T03:29:31.212Z', id: 28}),
  };
  expect(data.user.posts.pageInfo).toEqual(expect);
  expect(data.user.posts.edges[0].node.id).toBe(toGlobalId('Post', 2));
  expect(data.user.posts.edges[1].node.id).toBe(toGlobalId('Post', 28));
});

test('can handle nested pagination', async () => {
  const query = `{
    users(first: 2) {
      edges {
        node {
          fullName,
          posts(first: 2) {
            edges {
              node { body }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.edges.length).toBe(2);
  expect(data.users.edges[0].node.fullName).toBe('Alivia Waelchi');
  expect(data.users.edges[0].node.posts.edges.length).toBe(2);
  expect(data.users.edges[0].node.posts.edges[0].node.body).toBe(
    [
      'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
      'Deserunt nemo pariatur sed facere accusantium quis.',
      'Nobis aut voluptate inventore quidem explicabo.',
    ].join(' ')
  );
});

test('can handle deeply nested pagination', async () => {
  const query = `{
    users(first: 1) {
      edges {
        node {
          posts(first: 2) {
            edges {
              node {
                comments(first: 3) {
                  pageInfo {
                    hasNextPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id,
                      body
                      author { fullName }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const comments = data.users.edges[0].node.posts.edges[0].node.comments;
  const expected = {
    hasNextPage: true,
    startCursor: objToCursor({id: 233}),
    endCursor: objToCursor({id: 116}),
  };
  expect(comments.pageInfo).toEqual(expect);
  expect(comments.edges.length).toBe(3);
  expect(comments.edges[0]).toEqual({
    cursor: objToCursor({id: 233}),
    node: {
      id: toGlobalId('Comment', 233),
      body:
        "I'll reboot the digital SCSI system, that should bus the USB protocol!",
      author: {
        fullName: 'Coleman Abernathy',
      },
    },
  });
  expect(comments.edges.last().cursor).toBe(comments.pageInfo.endCursor);
});

test('handle a conection type with a many-to-many', async () => {
  const query = `{
    user(id: 2) {
      following(first: 2, after: "${objToCursor({
        created_at: '2016-01-01T16:28:00.051Z',
        followee_id: 1,
      })}") {
        pageInfo {
          hasNextPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            intimacy
            fullName
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.user.following.pageInfo).toEqual({
    hasNextPage: true,
    startCursor: objToCursor({
      created_at: '2016-05-18T21:35:54.601Z',
      followee_id: 3,
    }),
    endCursor: objToCursor({
      created_at: '2016-06-15T08:56:18.519Z',
      followee_id: 2,
    }),
  });
  expect(data.user.following.edges).toEqual([
    {
      node: {
        id: toGlobalId('User', 3),
        fullName: 'Coleman Abernathy',
        intimacy: 'acquaintance',
      },
    },
    {
      node: {
        id: toGlobalId('User', 2),
        fullName: 'Hudson Hyatt',
        intimacy: 'acquaintance',
      },
    },
  ]);
});

test('should handle pagination with duplicate objects', async () => {
  const user1Id = toGlobalId('User', 1);
  // notice the cyclical nature of this query. we get a user. then we get their posts.
  // then we get the author, who is that same user
  // we need to make sure join monster references the same object instead of cloning it
  const query = `{
    node(id: "${user1Id}") {
      ... on User {
        ...info
        posts(first: 3) {
          edges {
            node {
              body
              author {
                ...info
              }
            }
          }
        }
      }
    }
  }
  fragment info on User {
    id
    fullName
    email
    following {
      edges {
        node {
          id
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const following = {
    edges: [{node: {id: toGlobalId('User', 4)}}],
  };
  // this object gets duplicated in the result 4 times!
  const user1 = {
    id: user1Id,
    fullName: 'Alivia Waelchi',
    email: 'Mohammed.Hayes@hotmail.com',
    following,
  };
  const expected = {
    node: {
      ...user1,
      posts: {
        edges: [
          {
            node: {
              body: [
                'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
                'Deserunt nemo pariatur sed facere accusantium quis.',
                'Nobis aut voluptate inventore quidem explicabo.',
              ].join(' '),
              author: user1,
            },
          },
          {
            node: {
              body:
                'Eum iure laudantium officia doloremque et ut fugit ut. Magni eveniet ipsa.',
              author: user1,
            },
          },
          {
            node: {
              body: [
                'Incidunt quibusdam nulla adipisci error quia. Consequatur consequatur soluta fugit dolor iure.',
                'Voluptas accusamus fugiat assumenda enim.',
              ].join(' '),
              author: user1,
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('handle filtered pagination at the root', async () => {
  const query = `{
    users(search: "c%i") {
      edges {
        node {
          fullName
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data).toEqual({
    users: {
      edges: [
        {
          node: {fullName: 'Alivia Waelchi'},
        },
        {
          node: {fullName: 'Ocie Ruecker'},
        },
      ],
    },
  });
});

test('filtering on one-to-many-nested field', async () => {
  const query = `{
    user(id: 1) {
      posts(search: "ad") {
        edges {
          node {
            body
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.user.posts.edges).toEqual([
    {
      node: {
        body: [
          'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
          'Deserunt nemo pariatur sed facere accusantium quis.',
          'Nobis aut voluptate inventore quidem explicabo.',
        ].join(' '),
      },
    },
    {
      node: {
        body: [
          'Incidunt quibusdam nulla adipisci error quia. Consequatur consequatur soluta fugit dolor iure.',
          'Voluptas accusamus fugiat assumenda enim.',
        ].join(' '),
      },
    },
  ]);
});

test('should handle emptiness', async () => {
  const query = `{
    user(id: 6) {
      following {
        edges {
          node {
            id
          }
        }
      }
      posts {
        edges {
          node {
            id
            comments {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      following: {
        edges: [],
      },
      posts: {
        edges: [],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle a "where" condition on a paginated field', async () => {
  const query = `{
    users(first: 1) {
      edges {
        node {
          ...info
        }
      }
    }
  }
  fragment info on User {
    id
    fullName
    comments(first: 4, active: false, after: "${objToCursor({id: 287})}") {
      edges {
        node {
          id
          archived
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  expect(data.users.edges.length).toBe(1);
  expect(data.users.edges[0].node.fullName).toBe('Alivia Waelchi');
  const comments = data.users.edges[0].node.comments.edges.map((edge) => ({
    id: parseInt(fromGlobalId(edge.node.id).id, 10),
    archived: edge.node.archived,
  }));
  const expected = [
    {
      id: 278,
      archived: false,
    },
    {
      id: 273,
      archived: false,
    },
    {
      id: 266,
      archived: false,
    },
    {
      id: 244,
      archived: false,
    },
  ];
  expect(expected).toEqual(comments);
});

test('should handle "where" condition on main table of many-to-many relation', async () => {
  const query = `{
    user(id: 3) {
      fullName
      following(intimacy: acquaintance) {
        edges {
          node {
            id
            fullName
            intimacy
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'Coleman Abernathy',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 4),
              fullName: 'Lulu Bogisich',
              intimacy: 'acquaintance',
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle order columns on the main table', async () => {
  const query = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: true, after: "${objToCursor({
        created_at: '2015-10-19T05:48:04.537Z',
        id: 3,
      })}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 1),
              fullName: 'Alivia Waelchi',
            },
          },
          {
            node: {
              id: toGlobalId('User', 2),
              fullName: 'Hudson Hyatt',
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle order columns on the junction table', async () => {
  const cursor = objToCursor({
    created_at: '2016-01-01T16:28:00.051Z',
    followee_id: 1,
  });
  const query = `{
    user(id: 2) {
      fullName
      following(first: 2, sortOnMain: false, after: "${cursor}") {
        edges {
          node {
            id
            fullName
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      fullName: 'Hudson Hyatt',
      following: {
        edges: [
          {
            node: {
              id: toGlobalId('User', 3),
              fullName: 'Coleman Abernathy',
            },
          },
          {
            node: {
              id: toGlobalId('User', 2),
              fullName: 'Hudson Hyatt',
            },
          },
        ],
      },
    },
  };
  expect(expected).toEqual(data);
});

test('should handle an interface type', async () => {
  const query = `{
    user(id: 1) {
      writtenMaterial(first: 3) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          node {
            id
            body
          }
        }
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    pageInfo: {
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor:
        'eyJpZCI6MSwiY3JlYXRlZF9hdCI6IjIwMTYtMDctMTFUMDA6MjE6MjIuNTEwWiJ9',
      endCursor:
        'eyJpZCI6MywiY3JlYXRlZF9hdCI6IjIwMTYtMDEtMzFUMDk6MTA6MTIuOTQ2WiJ9',
    },
    edges: [
      {
        node: {
          id: 'Q29tbWVudDox',
          body:
            'Try to input the RSS circuit, maybe it will copy the auxiliary sensor!',
        },
      },
      {
        node: {
          id: 'UG9zdDoy',
          body: [
            'Adipisci voluptate laborum minima sunt facilis sint quibusdam ut.',
            'Deserunt nemo pariatur sed facere accusantium quis.',
            'Nobis aut voluptate inventore quidem explicabo.',
          ].join(' '),
        },
      },
      {
        node: {
          id: 'UG9zdDoz',
          body: [
            'Qui provident saepe laborum non est. Eaque aut enim officiis deserunt.',
            'Est sed suscipit praesentium et similique repudiandae.',
            'Inventore similique commodi non dolores inventore dolor est aperiam.',
          ].join(' '),
        },
      },
    ],
  };
  expect(expected).toEqual(data.user.writtenMaterial);
});
