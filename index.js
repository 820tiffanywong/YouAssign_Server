const { Neo4jGraphQL } = require("@neo4j/graphql");
const { ApolloServer, gql } = require("apollo-server");
const neo4j = require("neo4j-driver");

const AURA_ENDPOINT = "neo4j+s://d972d6ed.databases.neo4j.io";
const USERNAME = "neo4j";
const PASSWORD = "HIFRdWEIBLOxy5RKTZevQfNeQfnsrvPAUO_vlepCWiU";

const driver = neo4j.driver(AURA_ENDPOINT, neo4j.auth.basic(USERNAME, PASSWORD));

const typeDefs = gql`
	type User {
		first: String
		last: String
		slug: String
		email: String
		position: String
		bio: String
		date_joined: String
		img:String
		roles: [Role!]! @relationship(type: "HAS_ROLE", direction:OUT)
		projects: [Project!]! @relationship(type: "IS_ON_PROJECT", direction:OUT)
		companies: [Company!]! @relationship(type: "IS_A_MEMBER_OF", direction:OUT)
		skills: [Skill!]! @relationship(type: "HAS_SKILL", properties: "HasSkill", direction: OUT)
		user_connections_out: [User!]! @relationship(type: "HAS_CONNECTION", direction: OUT)
		user_connections_in: [User!]! @relationship(type: "HAS_CONNECTION", direction: IN)
	}

	type Role {
		title: String
		permissions: [Permission!]! @relationship(type: "HAS_PERMISSION", direction:OUT)
		users: [User!]! @relationship(type: "HAS_ROLE", direction:IN)
	}

	type Timestamp {
		id: ID! @id
		date: String!
		hours_logged: Float!
		description: String!
		user: User! @relationship(type: "LOGGED_TIMESTAMP", direction:IN)
		project: Project! @relationship(type: "HAS_TIMESTAMP", direction:IN)
	}

	type Permission {
		id: ID! @id
		name: String!
		access: String!
		resource :String!
		roles: [Role!]! @relationship(type: "HAS_PERMISSION", direction:IN)
	}

  	type Skill {
		id: ID! @id
		title: String
		img_src: String
		description: String
		date_added: String
		users: [User!]! @relationship(type: "HAS_SKILL", properties: "HasSkill", direction: IN)
		categories: [Category!]! @relationship(type: "IS_IN_CATEGORY", direction: OUT)
		projects: [Project!]! @relationship(type: "USED_BY_PROJECT", direction: IN)
	}

	type Event {
		id: ID! @id
		date: String!
		topic: String!
		description: String!
		likes: [User!]! @relationship(type: "LIKED_BY_USER", direction: IN)
	}  

	type Category {
		title: String!
		color: String!
		skills : [Skill!]! @relationship(type: "IS_IN_CATEGORY", direction: IN)
	}  

	type Company {
		id: ID! @id
		name: String!
		logo: String
		backgroundImage: String
		description: String
		employees: [User!]! @relationship(type:"IS_A_MEMBER_OF", direction:IN)
	}

	type Project {
		id: ID! @id
		title: String
		description: String
		skills_required : [Skill!]! @relationship(type: "REQUIRES_SKILL", direction: OUT)
		clients: [User!]! @relationship(type:"HAS_PROJECT",direction:IN)
		employees: [User!]! @relationship(type:"IS_ON_PROJECT", properties:"IsOnProject", direction:IN)
	}

	interface HasSkill @relationshipProperties {
		rating: Int!
		description: String
		isShowcased: Boolean
	} 

	interface IsOnProject @relationshipProperties {
		date_assigned: String!
		role: String
	} 

	type UserWithSkills {
		name: String
		skills: [String]
		percentKnown: Float
	}

	type Query{
		getUsersWithSkills(skillList: [String!]!, min: Int = 0, topK: Int = 5): [UserWithSkills!]! @cypher(
			statement: """
			MATCH (n:User)-[:HAS_SKILL]->(s:Skill)
			WHERE s.title in $skillList
			WITH n, collect(s.title) as skillSet, count(s) as known, toFloat(count(s))/size($skillList) as percentKnown
			WHERE known >= $min 
			RETURN {name: n.email, percentKnown: percentKnown, skills:skillSet}
			ORDER BY percentKnown DESC
			LIMIT $topK
			"""
		)
	}
`;

const neo4jGraphQL = new Neo4jGraphQL({
  typeDefs,
  driver
});

neo4jGraphQL.getSchema().then((schema) => {
  const server = new ApolloServer({
    schema,
    context: { 
        driverConfig: { 
            database: "neo4j" 
        } 
    }
  });
  server.listen({port: process.env.PORT || 4000}).then(({ url }) => {
    console.log(`GraphQL server ready at ${url}`);
  });
});