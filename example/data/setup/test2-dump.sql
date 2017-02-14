--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.3
-- Dumped by pg_dump version 9.5.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE accounts (
    id integer NOT NULL,
    email_address character varying(150),
    first_name character varying(255),
    last_name character varying(255),
    num_legs integer DEFAULT 2,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE accounts_id_seq OWNED BY accounts.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE comments (
    id integer NOT NULL,
    body text NOT NULL,
    post_id integer NOT NULL,
    author_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    archived boolean DEFAULT false
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE comments_id_seq OWNED BY comments.id;


--
-- Name: likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE likes (
    account_id integer NOT NULL,
    comment_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE posts (
    id integer NOT NULL,
    body text NOT NULL,
    author_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    archived boolean DEFAULT false
);


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE posts_id_seq OWNED BY posts.id;


--
-- Name: relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE relationships (
    follower_id integer NOT NULL,
    followee_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    closeness character varying
);


--
-- Name: sponsors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE sponsors (
    generation integer NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    num_legs integer DEFAULT 2,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY accounts ALTER COLUMN id SET DEFAULT nextval('accounts_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments ALTER COLUMN id SET DEFAULT nextval('comments_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts ALTER COLUMN id SET DEFAULT nextval('posts_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY accounts (id, email_address, first_name, last_name, num_legs, created_at) FROM stdin;
1	Mohammed.Hayes@hotmail.com	Alivia	Waelchi	2	2015-11-20 01:42:03.274-08
2	Rebekah_Larson30@hotmail.com	Hudson	Hyatt	2	2015-12-11 00:52:51.326-08
3	Lurline79@gmail.com	Coleman	Abernathy	2	2015-10-18 22:48:04.537-07
4	Ambrose_Hintz@yahoo.com	Lulu	Bogisich	2	2016-08-07 08:51:37.481-07
5	Wayne85@gmail.com	Ocie	Ruecker	2	2016-07-15 18:38:07.161-07
6	andrew@stem.is	Andrew	Carlson	2	2017-02-09 19:32:00-08
\.


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('accounts_id_seq', 5, true);


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY comments (id, body, post_id, author_id, created_at, archived) FROM stdin;
1	Try to input the RSS circuit, maybe it will copy the auxiliary sensor!	38	1	2016-07-10 17:21:22.51-07	f
2	The EXE monitor is down, calculate the digital bandwidth so we can transmit the SQL card!	13	2	2016-06-27 04:11:23.328-07	f
3	I'll generate the mobile FTP driver, that should matrix the PCI program!	18	1	2016-08-14 01:10:44.283-07	f
4	I'll navigate the cross-platform SMS transmitter, that should panel the IB sensor!	7	1	2015-12-01 06:05:51.176-08	f
6	The XML bandwidth is down, parse the multi-byte hard drive so we can synthesize the SAS monitor!	7	2	2016-04-22 22:03:28.585-07	f
7	I'll reboot the multi-byte HTTP system, that should application the TCP hard drive!	36	2	2015-12-15 22:47:59.258-08	f
8	Try to bypass the SDD system, maybe it will input the primary bus!	21	2	2016-03-07 13:38:57.75-08	f
9	I'll synthesize the digital RSS port, that should bandwidth the PNG system!	22	2	2015-11-16 11:39:36.005-08	f
11	Try to parse the SDD firewall, maybe it will generate the digital application!	30	2	2016-03-10 08:56:59.669-08	f
12	We need to hack the neural SMS transmitter!	7	1	2016-10-15 07:28:35.933-07	f
13	We need to calculate the 1080p HTTP array!	25	2	2016-09-28 11:19:56.02-07	f
16	You can't reboot the array without bypassing the 1080p RAM program!	47	4	2016-09-16 00:04:59.507-07	f
17	Try to hack the SMTP alarm, maybe it will transmit the redundant matrix!	25	4	2016-01-04 22:48:47.379-08	f
18	bypassing the hard drive won't do anything, we need to back up the primary EXE bandwidth!	2	3	2015-11-26 03:51:24.84-08	f
19	You can't index the monitor without connecting the multi-byte AI driver!	25	2	2015-11-14 06:09:35.153-08	f
21	You can't synthesize the matrix without indexing the haptic AI circuit!	48	2	2016-04-09 20:51:06.414-07	f
22	I'll calculate the digital SDD pixel, that should microchip the SMS sensor!	50	1	2016-04-06 04:10:57.967-07	f
23	Use the multi-byte GB protocol, then you can compress the auxiliary matrix!	20	2	2015-12-12 10:51:23.72-08	f
24	If we parse the application, we can get to the THX microchip through the virtual FTP bandwidth!	8	2	2016-08-01 19:10:16.053-07	f
26	You can't compress the card without quantifying the haptic JSON transmitter!	37	3	2015-12-01 20:51:18.505-08	f
27	I'll parse the digital PCI application, that should card the SAS array!	22	1	2016-04-10 11:06:17.652-07	f
28	We need to hack the cross-platform SMTP hard drive!	32	1	2015-10-29 11:49:46.964-07	f
29	Use the back-end TCP feed, then you can reboot the open-source circuit!	20	4	2016-07-07 04:51:50.263-07	f
31	Use the online PNG array, then you can quantify the primary sensor!	38	1	2015-11-17 18:05:01.04-08	f
32	Try to program the SMS program, maybe it will index the wireless matrix!	27	2	2016-01-23 22:47:15.765-08	f
33	You can't reboot the bandwidth without hacking the online SCSI feed!	42	5	2016-06-21 21:03:16.634-07	f
34	We need to reboot the multi-byte SQL bus!	9	5	2015-12-04 00:33:25.396-08	f
36	indexing the port won't do anything, we need to quantify the online SMTP panel!	23	4	2016-04-01 18:55:41.279-07	f
37	indexing the bus won't do anything, we need to bypass the mobile SCSI bandwidth!	50	5	2016-03-10 22:12:41.401-08	f
38	I'll synthesize the mobile SQL card, that should feed the EXE application!	8	1	2016-07-20 17:05:19.626-07	f
39	The CSS firewall is down, generate the bluetooth application so we can input the JSON transmitter!	4	4	2016-07-31 18:04:54.729-07	f
41	The RAM system is down, bypass the auxiliary panel so we can parse the SAS monitor!	12	2	2016-03-01 22:19:25.48-08	f
42	We need to reboot the open-source CSS hard drive!	15	5	2016-01-17 00:55:16.05-08	f
43	We need to program the primary IB interface!	33	5	2016-10-13 22:12:23.911-07	f
44	We need to copy the virtual USB circuit!	45	1	2016-04-29 22:13:12.453-07	f
46	Try to navigate the XSS application, maybe it will input the solid state array!	49	2	2016-09-13 09:22:43.666-07	f
47	We need to compress the primary PCI microchip!	40	4	2016-07-17 12:38:29.806-07	f
48	You can't generate the transmitter without quantifying the mobile SSL bus!	43	1	2016-04-02 04:12:00.696-07	f
49	The HDD sensor is down, parse the mobile driver so we can back up the FTP matrix!	4	5	2016-06-12 03:33:26.778-07	f
51	If we connect the system, we can get to the TCP firewall through the mobile PCI panel!	30	5	2016-03-14 15:06:33.985-07	f
52	Use the neural SCSI card, then you can connect the auxiliary array!	19	3	2016-05-21 13:25:48.086-07	f
53	The HDD pixel is down, calculate the neural array so we can hack the COM port!	24	5	2015-10-22 10:42:17.547-07	f
54	We need to transmit the optical USB array!	4	1	2016-01-31 03:04:25.112-08	f
56	parsing the alarm won't do anything, we need to parse the wireless IB capacitor!	35	1	2016-08-11 13:09:40.038-07	f
57	programming the array won't do anything, we need to connect the haptic JBOD feed!	9	5	2016-09-14 11:13:48.687-07	f
58	You can't program the alarm without transmitting the redundant SSL application!	16	2	2016-03-14 01:14:37.882-07	f
59	Use the bluetooth CSS program, then you can quantify the wireless microchip!	46	5	2016-05-25 00:00:28.134-07	f
61	I'll quantify the digital HDD feed, that should matrix the PNG protocol!	40	4	2016-01-21 07:46:36.641-08	f
45	We need to hack the back-end SMS interface!	19	1	2015-12-11 06:54:23.945-08	t
62	Use the online COM feed, then you can parse the solid state capacitor!	18	2	2016-06-15 08:31:51.821-07	f
63	We need to back up the optical SMTP monitor!	24	1	2015-12-25 00:42:37.54-08	f
64	Use the primary COM system, then you can hack the primary pixel!	35	4	2016-05-06 08:37:00.953-07	f
66	indexing the firewall won't do anything, we need to generate the solid state RAM port!	15	4	2015-12-27 08:09:48.468-08	f
67	overriding the system won't do anything, we need to connect the 1080p HDD system!	41	2	2016-07-09 07:24:53.69-07	f
68	If we generate the bandwidth, we can get to the USB application through the bluetooth SQL pixel!	11	1	2016-10-08 11:28:59.82-07	f
69	Try to connect the EXE system, maybe it will back up the online circuit!	23	2	2016-03-17 11:45:15.493-07	f
71	Try to program the RAM port, maybe it will synthesize the haptic bandwidth!	49	5	2016-01-23 16:48:28.483-08	f
72	Use the neural SMS circuit, then you can index the auxiliary matrix!	12	5	2016-05-11 23:22:55.381-07	f
73	Try to reboot the TCP application, maybe it will override the solid state matrix!	17	2	2016-09-16 03:59:43.145-07	f
74	Use the primary THX microchip, then you can index the neural firewall!	33	2	2016-08-13 06:42:57.802-07	f
76	We need to override the mobile SAS matrix!	21	5	2016-02-17 08:02:56.374-08	f
77	Use the cross-platform PNG card, then you can transmit the virtual panel!	24	5	2015-12-16 01:04:06.073-08	f
78	If we navigate the matrix, we can get to the PNG interface through the open-source SQL capacitor!	44	2	2015-12-16 15:51:29.685-08	f
79	copying the port won't do anything, we need to program the optical AGP card!	24	3	2015-11-28 16:02:33.937-08	f
81	Try to hack the ADP program, maybe it will back up the neural pixel!	50	4	2016-04-20 14:21:08.393-07	f
82	I'll compress the 1080p SQL sensor, that should monitor the RAM alarm!	28	4	2016-04-14 15:01:39.373-07	f
83	I'll generate the online EXE application, that should panel the HTTP feed!	9	5	2015-10-28 13:08:29.413-07	f
84	If we copy the pixel, we can get to the FTP interface through the auxiliary EXE capacitor!	32	4	2016-07-10 16:46:17.3-07	f
86	Try to bypass the SDD array, maybe it will hack the digital sensor!	3	3	2016-03-15 15:14:04.824-07	f
87	bypassing the firewall won't do anything, we need to quantify the neural SSL hard drive!	4	3	2016-03-07 10:47:51.703-08	f
88	I'll hack the back-end SAS driver, that should application the PCI microchip!	35	3	2016-01-23 13:01:22.508-08	f
89	We need to compress the optical EXE application!	9	1	2016-01-21 13:34:07.895-08	f
91	Try to reboot the THX alarm, maybe it will calculate the cross-platform bandwidth!	22	3	2016-07-06 22:44:18.621-07	f
92	The USB panel is down, generate the 1080p array so we can override the SSL application!	8	1	2016-04-22 02:00:08.051-07	f
93	You can't parse the panel without hacking the bluetooth IB interface!	15	4	2015-12-23 02:40:54.178-08	f
94	I'll copy the auxiliary TCP transmitter, that should circuit the TCP program!	11	2	2016-06-18 18:58:23.009-07	f
96	You can't override the sensor without synthesizing the solid state RAM firewall!	43	4	2015-10-23 03:35:16.683-07	f
97	Use the mobile USB system, then you can parse the 1080p alarm!	5	4	2016-01-13 08:08:07.875-08	f
98	The RSS matrix is down, input the cross-platform feed so we can program the PNG sensor!	26	4	2015-11-28 23:01:57.139-08	f
99	Use the haptic HTTP capacitor, then you can generate the cross-platform circuit!	37	2	2015-10-25 19:53:29.794-07	f
101	Use the neural IB card, then you can quantify the solid state microchip!	6	5	2016-02-02 17:01:38.383-08	f
102	compressing the sensor won't do anything, we need to connect the neural SQL matrix!	4	4	2016-01-10 20:18:23.519-08	f
103	If we generate the bus, we can get to the PNG transmitter through the 1080p FTP interface!	34	1	2016-06-12 16:59:45.353-07	f
104	The CSS program is down, compress the open-source port so we can generate the USB interface!	18	2	2016-08-18 22:49:51.689-07	f
106	We need to connect the online PNG panel!	37	2	2016-03-12 08:38:37.597-08	f
107	I'll quantify the cross-platform COM feed, that should monitor the XML sensor!	13	2	2016-08-14 08:17:55.809-07	f
108	bypassing the protocol won't do anything, we need to calculate the redundant PCI system!	18	1	2016-09-05 14:10:08.001-07	f
109	The RSS sensor is down, transmit the auxiliary protocol so we can back up the SAS bandwidth!	50	2	2015-12-06 13:52:41.216-08	f
111	The SCSI sensor is down, input the back-end bus so we can navigate the SQL panel!	43	3	2016-04-14 21:31:56.79-07	f
112	Try to program the XML monitor, maybe it will calculate the online driver!	20	4	2016-03-08 06:30:13.873-08	f
113	We need to reboot the auxiliary ADP transmitter!	39	4	2015-10-26 03:36:29.279-07	f
114	If we calculate the program, we can get to the FTP feed through the primary HDD program!	3	5	2016-05-04 03:05:46.369-07	f
116	The SQL sensor is down, connect the wireless firewall so we can override the SQL monitor!	2	2	2016-04-09 03:01:30.103-07	f
117	The SQL pixel is down, hack the auxiliary array so we can calculate the CSS pixel!	31	2	2016-01-04 04:43:12.154-08	f
118	The ADP hard drive is down, compress the haptic program so we can input the JBOD firewall!	44	5	2016-07-07 06:50:13.32-07	f
119	The RSS card is down, copy the neural array so we can back up the USB hard drive!	46	4	2016-07-30 15:51:58.119-07	f
121	We need to compress the redundant CSS bus!	26	1	2016-03-23 03:47:38.096-07	f
122	The HDD monitor is down, navigate the optical firewall so we can copy the AI protocol!	43	5	2015-12-04 19:39:34.356-08	f
123	Use the mobile EXE driver, then you can reboot the 1080p port!	29	5	2015-12-13 12:58:10.057-08	f
124	I'll index the open-source SSL microchip, that should capacitor the AGP port!	49	3	2016-03-07 08:24:05.386-08	f
126	I'll reboot the auxiliary HTTP application, that should driver the USB application!	30	3	2016-03-28 05:53:56.396-07	f
127	If we bypass the system, we can get to the TCP interface through the redundant ADP matrix!	9	1	2016-08-06 23:25:03.559-07	f
128	navigating the transmitter won't do anything, we need to back up the auxiliary COM application!	31	2	2015-12-05 05:22:57.335-08	f
129	I'll compress the online XSS pixel, that should monitor the THX card!	39	3	2016-09-08 02:49:32.639-07	f
131	You can't connect the alarm without compressing the back-end IB monitor!	28	5	2016-06-07 08:24:53.271-07	f
132	Try to navigate the THX firewall, maybe it will hack the back-end matrix!	3	3	2016-05-08 18:22:39.644-07	f
133	Use the multi-byte AGP pixel, then you can navigate the multi-byte bus!	47	3	2016-08-08 07:16:26.814-07	f
134	You can't reboot the firewall without parsing the wireless TCP sensor!	4	3	2016-02-20 16:32:19.63-08	f
136	The PNG port is down, synthesize the primary monitor so we can reboot the SCSI port!	29	4	2016-07-18 22:50:09.348-07	f
137	overriding the driver won't do anything, we need to program the multi-byte HTTP bandwidth!	37	1	2016-04-17 08:35:11.477-07	f
138	We need to transmit the bluetooth AI panel!	42	3	2016-06-21 15:30:29.079-07	f
139	Try to compress the ADP interface, maybe it will quantify the redundant sensor!	24	2	2016-01-05 01:00:24.937-08	f
141	You can't program the panel without connecting the redundant PCI system!	18	4	2016-05-23 17:15:44.152-07	f
142	Use the redundant HDD pixel, then you can connect the back-end port!	24	5	2016-01-06 07:10:02.695-08	f
143	Try to calculate the IB system, maybe it will back up the neural system!	19	5	2015-12-05 13:31:48.357-08	f
144	I'll compress the open-source PNG card, that should feed the XML bus!	37	3	2016-10-10 00:51:11.464-07	f
146	If we synthesize the bus, we can get to the TCP program through the virtual CSS bandwidth!	34	4	2016-03-20 08:55:27.533-07	f
147	You can't transmit the feed without generating the haptic CSS matrix!	22	1	2016-09-14 02:46:47.995-07	f
148	We need to hack the primary EXE hard drive!	5	2	2016-03-21 19:39:38.318-07	f
149	Use the online AI hard drive, then you can bypass the redundant bandwidth!	12	4	2016-05-23 13:49:15.212-07	f
151	The HDD matrix is down, back up the multi-byte pixel so we can copy the SMTP program!	46	4	2016-06-01 18:56:44.349-07	f
152	The PCI array is down, index the neural transmitter so we can compress the SDD panel!	17	4	2016-10-16 16:03:21.345-07	f
153	Use the neural JSON pixel, then you can input the back-end transmitter!	12	3	2016-07-22 08:23:40.42-07	f
154	I'll reboot the mobile HDD array, that should interface the USB protocol!	50	5	2016-07-26 15:25:58.608-07	f
156	Try to compress the EXE driver, maybe it will reboot the open-source driver!	25	1	2016-07-03 03:51:04.905-07	f
157	You can't override the protocol without synthesizing the primary AI microchip!	35	3	2016-09-04 13:08:39.166-07	f
158	Try to index the PCI bus, maybe it will transmit the cross-platform monitor!	43	3	2016-08-05 13:49:41.077-07	f
159	Try to hack the SQL system, maybe it will copy the cross-platform transmitter!	10	1	2016-09-03 02:30:25.596-07	f
161	I'll index the open-source SMS protocol, that should card the RSS interface!	30	5	2015-12-20 07:52:10.397-08	f
162	You can't calculate the monitor without indexing the optical AI system!	45	5	2016-01-11 00:37:29.998-08	f
163	transmitting the bandwidth won't do anything, we need to bypass the open-source THX feed!	46	1	2016-01-25 01:47:35.634-08	f
164	Use the primary TCP matrix, then you can reboot the redundant pixel!	42	5	2016-02-08 19:18:13.963-08	f
166	The SSL feed is down, override the optical microchip so we can generate the SMS protocol!	44	2	2016-09-20 12:02:37.209-07	f
167	You can't synthesize the hard drive without compressing the 1080p SCSI system!	24	5	2016-04-05 15:56:44.303-07	f
168	You can't input the transmitter without connecting the primary THX application!	25	3	2016-02-08 07:41:37.116-08	f
169	Try to hack the JSON microchip, maybe it will compress the neural hard drive!	20	4	2016-08-22 21:18:23.377-07	f
171	Try to generate the PCI alarm, maybe it will override the redundant bandwidth!	34	4	2016-03-08 08:49:39.655-08	f
172	The JSON matrix is down, reboot the mobile transmitter so we can hack the AGP card!	37	4	2016-05-02 07:57:21.199-07	f
173	We need to bypass the auxiliary PCI alarm!	45	2	2016-02-01 03:17:59.82-08	f
174	You can't back up the protocol without copying the bluetooth USB feed!	44	4	2015-12-03 10:37:23.298-08	f
176	generating the transmitter won't do anything, we need to transmit the optical EXE bandwidth!	46	4	2016-07-12 04:25:43.437-07	f
177	The FTP protocol is down, index the digital pixel so we can bypass the GB driver!	4	3	2016-07-25 00:52:46.181-07	f
178	You can't navigate the monitor without compressing the open-source RSS application!	38	1	2015-12-11 20:45:59.432-08	f
179	We need to reboot the mobile AGP alarm!	27	3	2016-06-30 02:50:19.391-07	f
181	I'll back up the optical TCP application, that should bandwidth the JBOD monitor!	44	4	2015-12-10 12:28:08.241-08	f
182	If we connect the microchip, we can get to the FTP sensor through the open-source USB circuit!	16	2	2016-07-18 06:52:09.533-07	f
183	If we index the pixel, we can get to the GB capacitor through the primary TCP interface!	27	5	2016-07-21 00:59:57.557-07	f
184	If we quantify the system, we can get to the HTTP interface through the virtual GB sensor!	36	5	2016-06-08 14:29:04.015-07	f
186	You can't copy the transmitter without compressing the bluetooth EXE program!	9	2	2016-03-10 20:29:20.204-08	f
187	You can't back up the array without hacking the primary HTTP microchip!	21	4	2016-05-05 08:50:23.803-07	f
188	We need to copy the mobile JSON bandwidth!	43	2	2016-04-16 07:32:58.879-07	f
189	Try to quantify the CSS pixel, maybe it will parse the neural feed!	38	4	2016-03-13 08:23:40.868-07	f
191	The AGP bus is down, index the cross-platform panel so we can parse the CSS application!	12	3	2016-05-17 13:10:50.595-07	f
192	You can't connect the capacitor without compressing the neural RSS hard drive!	23	5	2016-05-29 23:37:39.849-07	f
193	The HTTP pixel is down, reboot the back-end pixel so we can index the PCI hard drive!	13	4	2016-10-12 10:13:33.947-07	f
194	Try to parse the SQL array, maybe it will navigate the optical transmitter!	36	1	2015-11-18 14:28:58.737-08	f
196	compressing the port won't do anything, we need to copy the 1080p PCI system!	22	2	2016-05-11 20:29:53.175-07	f
197	Try to back up the XSS system, maybe it will hack the 1080p transmitter!	49	3	2016-08-05 17:35:09.963-07	f
198	Try to connect the RSS interface, maybe it will override the optical sensor!	29	1	2015-12-21 04:03:40.07-08	f
199	We need to override the back-end TCP card!	8	1	2015-10-29 14:03:16.761-07	f
201	The SMS bandwidth is down, synthesize the bluetooth sensor so we can index the AGP application!	12	2	2016-03-12 02:13:25.508-08	f
202	Use the cross-platform GB interface, then you can back up the open-source firewall!	50	3	2016-04-04 18:52:59.238-07	f
203	We need to override the optical RAM capacitor!	47	3	2016-03-10 19:16:15.618-08	f
204	I'll hack the online TCP circuit, that should panel the SMS capacitor!	48	5	2016-02-17 08:11:19.039-08	f
206	Use the back-end SSL array, then you can synthesize the wireless application!	41	3	2016-06-27 12:05:43.051-07	f
207	The XML monitor is down, back up the open-source driver so we can hack the SAS capacitor!	13	1	2016-01-25 13:13:03.046-08	f
208	If we back up the card, we can get to the TCP panel through the redundant CSS monitor!	24	1	2016-09-18 03:22:24.976-07	f
209	You can't index the application without generating the back-end SSL microchip!	46	5	2015-12-28 06:00:11.501-08	f
211	I'll connect the back-end XSS alarm, that should card the XSS circuit!	47	5	2015-12-09 19:49:58.934-08	f
212	The THX bandwidth is down, back up the optical capacitor so we can compress the XSS interface!	29	5	2016-01-24 04:18:54.188-08	f
213	connecting the application won't do anything, we need to reboot the multi-byte XSS driver!	15	5	2016-03-17 23:42:31.419-07	f
214	The HTTP microchip is down, connect the haptic application so we can input the RSS bandwidth!	40	2	2015-11-20 20:23:06.276-08	f
216	We need to reboot the haptic EXE program!	15	2	2016-05-02 17:29:49.65-07	f
217	If we quantify the port, we can get to the COM microchip through the open-source SMS program!	44	2	2016-06-22 10:35:19.928-07	f
218	Try to navigate the SQL hard drive, maybe it will index the optical application!	17	2	2016-06-02 01:20:55.571-07	f
219	You can't compress the card without overriding the multi-byte SQL system!	18	5	2016-09-22 22:45:19.656-07	f
221	We need to navigate the virtual PCI application!	32	2	2016-08-24 01:14:06.569-07	f
222	If we hack the application, we can get to the SMTP alarm through the bluetooth SSL feed!	34	4	2016-02-18 19:18:06.074-08	f
223	Try to bypass the XSS array, maybe it will transmit the multi-byte protocol!	50	2	2016-08-15 08:03:30.704-07	f
224	If we synthesize the transmitter, we can get to the SCSI panel through the wireless SAS microchip!	47	5	2016-06-10 13:50:28.293-07	f
226	If we copy the transmitter, we can get to the SCSI bandwidth through the wireless SSL application!	36	2	2016-01-19 00:11:52.025-08	f
227	Use the solid state AI alarm, then you can connect the digital array!	2	5	2016-04-02 04:42:06.312-07	f
228	The JSON card is down, quantify the optical bus so we can generate the SMTP bandwidth!	45	4	2016-07-27 03:25:41.853-07	f
229	Use the virtual SMS bandwidth, then you can compress the primary capacitor!	28	5	2015-10-20 03:17:05.195-07	f
231	You can't quantify the matrix without programming the bluetooth RAM bandwidth!	48	2	2015-10-24 11:51:15.286-07	f
232	calculating the monitor won't do anything, we need to override the primary AI hard drive!	24	5	2016-09-28 22:35:39.732-07	f
233	I'll reboot the digital SCSI system, that should bus the USB protocol!	2	3	2016-04-29 04:21:24.47-07	f
234	We need to calculate the solid state XSS port!	41	3	2016-06-17 02:24:53.132-07	f
236	Try to input the XSS sensor, maybe it will synthesize the mobile feed!	26	3	2016-05-27 18:23:08.617-07	f
237	If we index the application, we can get to the THX array through the multi-byte COM driver!	29	1	2016-04-14 06:07:25.472-07	f
238	You can't generate the circuit without parsing the wireless SMTP driver!	10	4	2016-07-23 16:29:31.765-07	f
239	Use the optical TCP hard drive, then you can calculate the online array!	11	2	2016-04-22 12:37:08.875-07	f
190	We need to bypass the neural SMS capacitor!	19	3	2016-09-30 00:21:06.957-07	t
241	programming the microchip won't do anything, we need to transmit the neural HDD capacitor!	9	1	2016-02-21 09:23:33.227-08	f
242	Use the optical FTP capacitor, then you can index the 1080p card!	13	3	2016-07-03 02:18:52.665-07	f
243	indexing the circuit won't do anything, we need to generate the online SMTP bus!	5	3	2016-04-06 08:15:39.181-07	f
244	Try to quantify the XML system, maybe it will parse the solid state panel!	4	1	2016-04-02 18:00:10.131-07	f
246	indexing the array won't do anything, we need to generate the haptic PCI bandwidth!	29	3	2016-03-21 14:23:38.77-07	f
247	Try to synthesize the XML application, maybe it will synthesize the redundant bandwidth!	6	2	2015-12-24 15:05:42.397-08	f
248	backing up the protocol won't do anything, we need to synthesize the digital ADP hard drive!	7	4	2015-11-14 09:50:01.508-08	f
249	You can't override the microchip without generating the haptic JSON sensor!	45	3	2016-02-22 11:47:35.566-08	f
251	You can't calculate the matrix without copying the online CSS protocol!	49	4	2016-02-07 02:34:26.526-08	f
252	copying the microchip won't do anything, we need to parse the optical SAS panel!	16	3	2016-06-27 15:35:47.077-07	f
253	Use the neural SSL sensor, then you can transmit the wireless hard drive!	36	2	2016-05-23 02:00:45.363-07	f
254	navigating the panel won't do anything, we need to bypass the mobile GB pixel!	12	2	2016-04-04 11:23:37.488-07	f
256	indexing the hard drive won't do anything, we need to override the bluetooth RSS interface!	10	4	2016-05-15 06:57:11.335-07	f
257	You can't copy the hard drive without generating the 1080p AGP alarm!	38	3	2016-08-16 03:02:47.563-07	f
258	We need to program the solid state RAM driver!	44	2	2016-09-19 10:09:37.801-07	f
259	If we bypass the array, we can get to the XML circuit through the online SAS capacitor!	47	3	2016-06-09 22:58:14.783-07	f
261	Use the haptic FTP panel, then you can generate the auxiliary alarm!	14	4	2016-08-18 05:04:23.087-07	f
262	compressing the bus won't do anything, we need to navigate the neural AGP interface!	32	2	2016-06-19 12:29:17.949-07	f
263	We need to bypass the bluetooth XML program!	3	2	2016-07-15 23:35:49.524-07	f
264	Use the solid state XSS matrix, then you can parse the cross-platform transmitter!	37	3	2015-12-23 08:27:28.355-08	f
266	Use the open-source AGP capacitor, then you can hack the digital bandwidth!	28	1	2016-05-11 11:30:52.334-07	f
267	I'll connect the auxiliary USB port, that should hard drive the GB application!	24	2	2016-04-14 08:10:27.412-07	f
268	We need to connect the multi-byte FTP bandwidth!	47	2	2016-02-18 03:31:03.301-08	f
269	If we calculate the circuit, we can get to the RSS sensor through the redundant FTP bandwidth!	19	2	2016-08-14 05:49:06.107-07	f
271	Try to input the SMTP capacitor, maybe it will input the cross-platform firewall!	4	2	2016-01-29 01:17:47.078-08	f
272	Try to navigate the COM application, maybe it will generate the neural bus!	47	2	2016-02-05 01:01:56.883-08	f
273	I'll reboot the neural SDD transmitter, that should panel the RAM microchip!	6	1	2015-10-24 00:11:45.795-07	f
274	We need to transmit the auxiliary XSS firewall!	8	4	2015-12-23 12:08:27.24-08	f
276	You can't synthesize the system without quantifying the solid state SQL program!	33	2	2016-07-07 20:10:14.841-07	f
277	We need to connect the primary CSS system!	20	5	2015-12-31 01:05:12.152-08	f
278	You can't index the bandwidth without quantifying the solid state ADP hard drive!	41	1	2016-01-29 07:42:34.549-08	f
279	generating the panel won't do anything, we need to connect the digital THX microchip!	17	4	2015-12-13 23:29:30.398-08	f
281	We need to reboot the wireless SCSI bandwidth!	34	5	2016-05-25 15:18:31.902-07	f
282	If we program the monitor, we can get to the HTTP capacitor through the solid state THX port!	18	4	2016-09-26 14:35:20.964-07	f
283	I'll compress the virtual XML bandwidth, that should sensor the ADP transmitter!	16	4	2016-05-29 01:17:58.031-07	f
284	You can't parse the sensor without backing up the virtual AI program!	18	4	2016-10-12 21:07:16.029-07	f
286	hacking the hard drive won't do anything, we need to connect the open-source THX system!	6	3	2016-02-04 21:48:22.369-08	f
287	You can't transmit the monitor without transmitting the multi-byte GB bandwidth!	50	3	2016-07-13 00:52:57.987-07	f
288	We need to reboot the cross-platform SCSI monitor!	31	1	2016-04-14 09:09:58.57-07	f
289	We need to index the mobile SMS microchip!	49	5	2016-02-26 09:27:02.193-08	f
291	If we index the sensor, we can get to the SMS port through the back-end AI array!	23	1	2016-10-02 13:33:01.651-07	f
292	If we calculate the alarm, we can get to the TCP bandwidth through the online XSS pixel!	38	5	2016-10-04 15:49:44.12-07	f
293	If we parse the alarm, we can get to the SQL transmitter through the cross-platform HDD array!	7	2	2016-07-24 14:32:04.799-07	f
294	Use the wireless THX transmitter, then you can back up the optical system!	42	2	2016-02-03 05:38:46.32-08	f
296	Use the auxiliary AI port, then you can parse the mobile matrix!	49	3	2016-03-28 16:25:44.198-07	f
297	Use the redundant SCSI array, then you can compress the haptic card!	8	5	2016-08-04 09:22:06.27-07	f
298	We need to generate the cross-platform TCP bus!	34	2	2015-11-05 15:54:35.165-08	f
299	hacking the panel won't do anything, we need to bypass the wireless EXE sensor!	9	1	2016-02-02 01:21:58.022-08	f
10	Use the neural JSON port, then you can hack the 1080p system!	47	4	2016-08-16 14:41:02.362-07	t
15	If we calculate the monitor, we can get to the AGP driver through the solid state JBOD matrix!	9	3	2015-12-26 06:53:10.66-08	t
20	overriding the pixel won't do anything, we need to parse the wireless USB feed!	26	4	2016-04-29 14:24:42.21-07	t
25	The XSS transmitter is down, quantify the neural program so we can parse the SDD alarm!	9	5	2016-10-04 15:49:48.602-07	t
30	If we compress the card, we can get to the COM circuit through the optical SSL bandwidth!	40	5	2016-03-22 19:34:03.503-07	t
35	hacking the protocol won't do anything, we need to reboot the online AGP interface!	43	3	2016-04-30 08:56:33.647-07	t
40	I'll generate the bluetooth SAS microchip, that should port the EXE driver!	28	1	2015-10-20 08:45:37.713-07	t
50	connecting the protocol won't do anything, we need to compress the cross-platform SDD transmitter!	22	5	2015-12-03 04:54:07.996-08	t
55	Try to synthesize the RSS matrix, maybe it will synthesize the bluetooth array!	16	4	2015-12-15 06:13:44.391-08	t
60	The AI firewall is down, bypass the digital sensor so we can index the XSS pixel!	26	4	2016-08-02 06:10:33.397-07	t
65	I'll back up the bluetooth ADP bus, that should sensor the JBOD feed!	14	3	2015-12-15 18:48:03.997-08	t
70	Try to index the SQL firewall, maybe it will compress the neural pixel!	37	2	2016-09-02 20:48:46.21-07	t
75	I'll quantify the redundant PCI feed, that should firewall the EXE bus!	26	3	2016-01-24 00:37:47.378-08	t
80	We need to quantify the virtual RAM port!	32	2	2016-06-08 03:14:12.261-07	t
85	I'll generate the solid state SSL matrix, that should program the IB bandwidth!	38	3	2015-12-22 16:47:36.718-08	t
90	calculating the panel won't do anything, we need to override the cross-platform USB protocol!	4	2	2016-07-09 09:00:50.68-07	t
95	We need to connect the optical USB program!	16	2	2016-03-25 18:42:20.05-07	t
100	The CSS microchip is down, connect the solid state protocol so we can navigate the PNG program!	23	4	2016-03-17 14:48:57.31-07	t
105	I'll override the haptic THX bandwidth, that should circuit the EXE firewall!	41	4	2016-06-19 13:08:05.754-07	t
110	connecting the array won't do anything, we need to generate the haptic PNG bus!	30	4	2016-06-02 12:07:59.155-07	t
115	programming the bus won't do anything, we need to calculate the mobile AI application!	5	4	2016-02-24 18:29:02.582-08	t
120	You can't input the transmitter without transmitting the 1080p HTTP driver!	13	3	2015-12-04 04:47:45.81-08	t
125	You can't override the driver without overriding the wireless RAM sensor!	20	2	2016-01-08 05:51:21.539-08	t
130	I'll generate the wireless HDD interface, that should array the FTP card!	26	1	2016-03-09 19:58:51.976-08	t
135	You can't synthesize the firewall without transmitting the multi-byte AGP program!	36	5	2016-01-16 22:25:18.95-08	t
140	You can't quantify the microchip without compressing the multi-byte GB microchip!	16	4	2016-02-08 21:21:05.021-08	t
145	Use the solid state ADP system, then you can parse the multi-byte pixel!	39	5	2015-11-11 23:15:38.184-08	t
150	If we hack the application, we can get to the JSON circuit through the redundant SMS interface!	40	4	2015-12-06 14:02:43.745-08	t
155	Use the mobile JSON monitor, then you can parse the solid state program!	39	4	2016-07-01 01:03:07.606-07	t
160	overriding the feed won't do anything, we need to parse the digital IB monitor!	14	4	2016-10-06 13:41:59.357-07	t
165	navigating the sensor won't do anything, we need to quantify the neural PCI driver!	29	2	2016-02-12 08:49:45.225-08	t
170	I'll back up the bluetooth COM bandwidth, that should driver the SSL interface!	19	5	2016-02-02 02:53:14.437-08	t
175	Try to synthesize the COM sensor, maybe it will program the primary hard drive!	28	1	2016-05-03 23:15:08.796-07	t
185	The RAM capacitor is down, quantify the 1080p pixel so we can index the XML monitor!	31	1	2016-10-14 05:51:17.091-07	t
195	If we index the firewall, we can get to the PNG alarm through the solid state FTP card!	28	3	2016-05-03 21:44:15.847-07	t
200	Use the bluetooth THX hard drive, then you can reboot the back-end hard drive!	37	3	2016-08-18 16:22:19.159-07	t
205	We need to navigate the open-source JBOD transmitter!	37	5	2016-03-02 14:29:14.669-08	t
210	The CSS microchip is down, input the 1080p interface so we can bypass the GB firewall!	42	5	2016-06-26 11:14:52.818-07	t
215	You can't quantify the protocol without programming the wireless SCSI monitor!	13	2	2016-02-25 05:21:27.919-08	t
220	We need to quantify the haptic XML circuit!	10	2	2016-10-03 03:13:26.548-07	t
225	synthesizing the hard drive won't do anything, we need to parse the auxiliary SCSI bandwidth!	18	4	2016-03-17 02:37:24.682-07	t
230	I'll quantify the open-source ADP transmitter, that should alarm the SMS pixel!	30	3	2016-07-21 08:33:45.448-07	t
235	Use the primary USB system, then you can program the redundant driver!	35	5	2016-04-03 00:17:57.101-07	t
240	I'll transmit the bluetooth XSS sensor, that should pixel the AGP pixel!	41	1	2016-06-23 17:12:50.893-07	t
245	If we program the circuit, we can get to the PNG circuit through the solid state XML firewall!	17	3	2015-11-11 05:50:04.551-08	t
250	We need to connect the bluetooth CSS bandwidth!	13	5	2016-02-28 20:48:35.597-08	t
255	Use the optical AGP driver, then you can navigate the neural matrix!	7	3	2016-01-26 07:52:31.162-08	t
260	We need to navigate the wireless SMTP protocol!	9	2	2015-11-08 20:33:24.158-08	t
265	Try to override the HDD feed, maybe it will bypass the digital port!	47	2	2016-04-12 15:03:17.459-07	t
270	We need to back up the 1080p SCSI sensor!	37	3	2016-02-17 13:41:57.942-08	t
275	You can't transmit the microchip without quantifying the bluetooth AGP application!	11	4	2016-03-25 07:13:31.485-07	t
280	overriding the pixel won't do anything, we need to copy the cross-platform XSS matrix!	39	2	2016-01-01 00:02:53.275-08	t
285	transmitting the interface won't do anything, we need to transmit the solid state FTP matrix!	32	4	2016-05-23 05:13:36.35-07	t
290	You can't calculate the microchip without compressing the bluetooth PCI sensor!	45	2	2016-04-03 06:24:34.572-07	t
295	Try to calculate the ADP hard drive, maybe it will reboot the primary alarm!	36	5	2016-01-06 03:06:59.944-08	t
300	We need to index the bluetooth SDD program!	8	2	2016-10-04 04:12:46.156-07	t
\.


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('comments_id_seq', 300, true);


--
-- Data for Name: likes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY likes (account_id, comment_id, created_at) FROM stdin;
4	49	2016-06-04 07:43:50.609-07
4	282	2016-07-15 14:14:18.86-07
2	195	2016-11-08 06:17:06.384-08
3	87	2016-02-25 21:39:57.049-08
4	240	2016-10-31 16:40:36.643-07
1	130	2016-11-29 21:57:47.836-08
2	58	2016-08-04 19:02:24.858-07
4	146	2016-06-09 06:06:15.822-07
1	31	2016-10-19 05:28:38.885-07
2	64	2016-03-02 05:54:50.079-08
2	258	2016-02-16 01:15:35.098-08
4	271	2017-02-09 13:13:53.78-08
2	21	2017-02-06 00:57:59.743-08
2	299	2016-11-30 17:23:30.654-08
2	105	2016-06-29 15:43:15.232-07
1	280	2016-12-27 13:54:22.178-08
4	234	2016-02-24 06:15:39.783-08
5	20	2016-02-28 05:35:36.705-08
1	188	2016-06-06 15:16:43.062-07
4	202	2016-09-05 01:34:39.852-07
3	10	2016-04-09 20:19:00.838-07
4	92	2016-12-24 19:28:48.817-08
3	118	2016-04-26 20:09:21.827-07
5	37	2016-11-16 05:36:31.232-08
4	40	2016-12-13 06:27:00.55-08
3	187	2016-11-22 15:47:29.512-08
4	143	2016-06-06 20:07:57.648-07
4	142	2016-09-15 20:52:28.264-07
3	86	2016-11-23 19:11:56.595-08
3	178	2016-11-04 20:17:04.645-07
2	218	2016-03-18 00:15:14.783-07
4	184	2016-12-26 07:05:24.738-08
3	198	2016-08-19 15:11:31.286-07
3	227	2016-07-13 19:07:40.289-07
2	265	2016-03-14 17:38:18.11-07
3	201	2016-03-22 07:32:27.837-07
3	296	2016-07-27 23:26:47.979-07
4	276	2016-07-04 13:38:21.676-07
2	79	2017-01-03 04:12:37.939-08
3	280	2016-12-31 03:38:25.904-08
3	34	2016-07-05 10:24:46.808-07
2	62	2016-10-06 09:41:25.031-07
5	49	2016-09-15 02:25:58.599-07
3	131	2016-05-10 13:25:57.548-07
1	207	2016-07-15 06:13:37.453-07
2	154	2016-09-13 10:05:36.788-07
3	176	2016-07-03 04:24:34.815-07
5	224	2016-06-30 20:22:05.834-07
1	151	2016-06-17 01:14:14.232-07
2	210	2016-07-17 19:46:04.415-07
5	87	2016-08-10 07:43:12.105-07
1	283	2016-03-08 00:00:24.914-08
4	100	2016-03-24 11:32:38.744-07
1	91	2016-07-05 09:06:24.774-07
5	84	2016-11-02 17:04:03.702-07
2	84	2017-01-05 11:07:34.658-08
5	254	2016-12-12 16:29:57.507-08
1	209	2016-08-05 13:24:43.049-07
3	194	2016-04-16 13:38:47.491-07
5	77	2016-02-19 20:34:16.293-08
3	291	2016-09-26 15:13:15.491-07
5	151	2016-02-21 16:05:13.746-08
5	187	2016-06-23 03:01:11.485-07
2	184	2016-07-16 18:39:54.962-07
3	258	2016-04-28 03:39:12.413-07
1	70	2016-08-13 01:54:50.164-07
1	178	2016-04-05 19:48:05.482-07
3	153	2016-09-13 23:29:31.544-07
2	98	2016-10-18 05:50:43.452-07
5	69	2016-09-09 23:19:24.28-07
4	48	2016-03-29 19:40:43.611-07
2	189	2016-11-03 22:36:26.199-07
3	151	2016-05-31 07:00:43.084-07
4	45	2016-04-15 13:35:45.911-07
5	3	2016-05-24 10:50:46.003-07
5	292	2016-12-10 08:20:34.751-08
5	249	2016-09-19 18:34:58.515-07
1	135	2017-01-25 07:35:53.262-08
5	26	2016-05-05 03:56:17.723-07
5	150	2016-12-15 23:08:12.68-08
1	126	2016-06-27 08:57:51.578-07
5	73	2016-03-15 06:43:59.759-07
3	64	2016-10-02 15:06:45.959-07
4	118	2016-05-22 10:50:23.771-07
4	162	2016-06-19 03:45:38.909-07
4	192	2017-01-19 03:02:45.999-08
2	226	2016-02-17 19:26:14.131-08
3	43	2016-08-27 09:10:37.085-07
4	22	2016-11-01 10:10:30.028-07
5	205	2016-05-07 18:52:38.361-07
5	25	2016-02-21 02:37:05.262-08
4	204	2016-10-07 22:17:41.377-07
1	93	2016-04-11 14:40:15.346-07
1	146	2016-06-15 17:38:03.884-07
5	81	2016-11-09 09:46:09.048-08
4	41	2016-09-12 20:04:03.907-07
2	8	2016-10-30 11:37:25.734-07
3	132	2016-08-20 17:55:47.812-07
5	211	2016-06-20 03:19:33.382-07
1	193	2016-09-17 06:51:45.51-07
5	29	2016-03-22 20:04:40.829-07
5	272	2016-11-10 12:08:50.883-08
3	61	2016-09-21 11:42:52.832-07
5	79	2016-02-24 18:10:26.764-08
5	219	2016-06-09 23:25:22.255-07
5	102	2016-07-29 02:50:10.698-07
5	52	2016-04-08 01:28:12.982-07
3	196	2017-01-16 03:11:46.816-08
4	241	2016-02-10 20:35:13.649-08
1	69	2016-03-18 12:15:14.483-07
2	71	2016-10-28 11:18:38.368-07
4	121	2017-02-05 05:53:33.287-08
2	36	2016-04-15 23:32:07.544-07
5	64	2016-08-06 03:32:39.564-07
1	133	2016-03-01 21:29:35.985-08
3	154	2016-07-26 16:39:13.621-07
2	222	2016-12-28 16:48:16.613-08
2	118	2016-03-23 20:04:21.848-07
3	290	2016-08-19 13:31:22.037-07
5	2	2016-12-13 19:14:59.761-08
3	104	2016-12-14 17:13:07.091-08
3	105	2016-10-29 12:43:02.272-07
4	172	2016-03-22 14:33:40.921-07
1	46	2016-11-28 11:20:13.828-08
5	14	2016-07-24 05:12:47.499-07
2	43	2016-12-02 15:48:53.896-08
2	50	2016-03-11 11:56:58.353-08
2	147	2016-04-30 23:45:06.185-07
2	127	2016-07-28 14:03:48.813-07
1	112	2016-05-08 01:25:40.471-07
3	108	2016-12-11 00:04:48.199-08
5	134	2016-05-29 08:51:41.88-07
4	130	2016-05-22 02:53:11.312-07
2	80	2016-05-26 10:42:48.488-07
5	283	2017-01-23 22:17:49.561-08
1	19	2016-11-18 15:39:34.96-08
5	204	2017-01-20 18:01:45.664-08
1	197	2016-05-04 02:06:07.061-07
2	93	2016-05-08 20:41:28.698-07
2	72	2016-02-21 00:09:11.259-08
4	120	2016-12-16 19:07:27.622-08
2	151	2016-11-15 02:52:19.115-08
2	186	2016-11-19 23:58:14.002-08
1	122	2016-07-30 18:09:58.295-07
3	282	2017-02-06 21:24:36.222-08
4	113	2016-10-20 15:50:50.363-07
5	262	2016-07-28 20:39:42.423-07
3	229	2016-10-06 16:02:05.898-07
5	34	2016-02-24 13:34:20.444-08
3	254	2016-12-10 00:26:21.208-08
5	296	2016-10-17 04:50:12.461-07
4	124	2016-02-11 11:26:05.431-08
4	112	2016-03-27 19:21:58.418-07
3	267	2016-12-07 04:18:26.629-08
3	14	2016-05-26 19:12:26.452-07
2	209	2016-06-24 12:34:17-07
4	284	2016-10-14 15:42:52.923-07
5	88	2016-10-27 03:33:53.534-07
1	23	2016-05-31 08:20:40.235-07
4	106	2016-09-10 07:48:06.661-07
2	3	2016-07-29 14:25:42.814-07
5	235	2016-07-06 04:07:04.193-07
4	123	2016-02-23 02:17:03.728-08
2	11	2016-11-11 08:31:00.526-08
1	212	2017-01-29 11:16:01.02-08
1	144	2016-05-04 20:23:35.33-07
3	233	2016-03-16 00:29:52.162-07
3	106	2016-09-08 09:12:23.54-07
2	275	2016-10-03 09:19:49.031-07
2	117	2016-12-10 12:21:17.138-08
2	274	2016-02-28 14:57:42.934-08
1	64	2016-12-01 09:35:32.073-08
3	8	2016-12-09 02:56:18.648-08
4	135	2016-08-26 13:17:35.08-07
1	98	2016-06-28 08:18:32.896-07
2	250	2016-06-25 16:30:09.942-07
1	183	2017-01-06 14:41:09.415-08
3	68	2017-02-04 04:23:18.777-08
5	206	2016-08-16 07:04:37.036-07
1	85	2016-07-14 03:11:06.832-07
4	47	2016-09-03 08:50:59.691-07
4	295	2016-12-24 01:32:56.289-08
4	163	2016-05-06 21:04:56.699-07
3	49	2016-05-21 12:17:18.537-07
4	105	2016-09-02 02:59:30.501-07
1	232	2016-07-26 14:18:43.996-07
4	194	2016-06-11 12:51:56.77-07
1	234	2016-10-28 14:21:02.897-07
4	97	2016-05-23 02:09:16.571-07
2	67	2016-04-26 06:33:10.565-07
5	96	2016-04-14 02:17:55.779-07
1	129	2016-12-03 05:32:44.166-08
5	176	2016-04-28 15:32:48.582-07
3	219	2016-03-25 01:57:41.353-07
5	161	2016-04-17 17:06:12.734-07
3	244	2016-08-01 22:48:44.792-07
2	253	2016-08-21 03:31:59.226-07
4	55	2016-09-24 08:35:35.482-07
1	204	2016-04-25 15:08:27.798-07
4	70	2016-07-09 20:53:09.378-07
4	21	2016-05-10 02:57:13.188-07
5	97	2016-04-23 00:09:05.351-07
2	13	2016-02-21 19:34:55.326-08
1	229	2016-05-30 05:13:12.783-07
2	101	2016-05-06 01:51:20.756-07
4	156	2016-07-27 23:09:45.172-07
1	191	2017-01-31 07:28:03.712-08
3	103	2016-06-04 02:31:36.712-07
5	41	2016-05-24 23:10:48.713-07
2	236	2016-12-30 17:57:04.219-08
2	165	2016-12-29 01:42:37.516-08
4	140	2016-08-25 10:20:30.424-07
3	273	2016-10-19 07:55:36.024-07
2	264	2016-12-07 15:01:13.453-08
5	48	2016-11-25 13:07:13.729-08
1	1	2016-03-19 04:16:09.882-07
1	3	2016-04-06 09:58:57.097-07
5	131	2016-09-25 01:07:38.391-07
5	212	2016-11-13 04:41:18.669-08
4	126	2016-03-10 02:45:56.005-08
4	147	2016-05-04 18:03:25.427-07
5	132	2016-12-14 21:53:38.039-08
1	116	2016-07-29 18:26:00.118-07
4	136	2016-04-18 00:38:06.874-07
1	108	2016-05-16 14:14:12.325-07
2	26	2016-09-14 08:15:45.166-07
3	293	2016-05-18 00:56:39.609-07
3	243	2016-08-15 05:02:29.55-07
2	37	2016-04-12 08:58:45.163-07
4	35	2017-01-29 09:53:20.712-08
2	106	2016-07-29 02:04:44.89-07
1	103	2016-03-30 09:39:40.92-07
5	247	2016-04-25 10:16:28.563-07
1	61	2016-09-06 17:00:45.077-07
5	50	2016-02-13 17:41:06.615-08
1	245	2016-03-01 14:03:55.474-08
3	75	2016-06-06 05:08:22.926-07
3	22	2016-08-08 23:17:40.612-07
1	202	2016-08-08 15:17:17.011-07
5	54	2016-11-09 09:29:11.373-08
4	265	2016-12-01 19:18:53.093-08
2	246	2016-04-11 14:47:51.585-07
3	279	2016-06-02 13:31:13.314-07
1	253	2016-12-19 23:29:41.554-08
1	167	2016-11-15 11:49:08.094-08
4	157	2017-02-04 20:51:08.529-08
2	69	2016-05-29 10:10:53.588-07
2	4	2016-11-25 01:13:36.981-08
3	260	2016-04-25 14:47:14.903-07
1	37	2016-12-02 17:25:43.909-08
3	129	2016-12-25 04:53:11.053-08
3	240	2016-04-09 05:36:32.81-07
2	263	2016-06-13 12:28:12.999-07
5	74	2016-05-22 23:58:49.953-07
5	107	2016-08-05 02:51:56.041-07
1	184	2016-06-03 11:02:36.275-07
5	293	2016-09-16 02:31:55.148-07
4	74	2016-03-31 20:05:03.655-07
3	48	2017-02-03 06:47:37.587-08
2	155	2016-10-19 22:53:48.196-07
5	125	2016-11-14 00:06:43.366-08
2	111	2017-01-10 00:51:33.848-08
2	83	2016-09-26 14:43:06.48-07
2	175	2016-06-06 15:22:34.171-07
1	164	2017-01-28 11:59:59.441-08
5	269	2016-10-27 19:56:12.828-07
1	81	2016-06-27 11:05:35.239-07
1	270	2016-11-25 22:48:21.619-08
1	92	2016-09-07 18:27:37.536-07
1	217	2016-12-25 10:09:07.307-08
1	262	2016-04-15 11:37:29.583-07
2	159	2016-10-29 18:35:21.437-07
3	137	2016-10-23 19:21:01.15-07
3	147	2016-12-24 04:36:14.052-08
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY posts (id, body, author_id, created_at, archived) FROM stdin;
1	Omnis quae dolorem molestiae corporis. Laboriosam iure quis sint et libero blanditiis est. Itaque aspernatur harum aliquid magnam esse molestias tempora. Ratione fugiat enim fuga.	2	2016-06-09 23:44:19.485-07	f
2	Adipisci voluptate laborum minima sunt facilis sint quibusdam ut. Deserunt nemo pariatur sed facere accusantium quis. Nobis aut voluptate inventore quidem explicabo.	1	2016-04-17 11:49:15.942-07	f
3	Qui provident saepe laborum non est. Eaque aut enim officiis deserunt. Est sed suscipit praesentium et similique repudiandae. Inventore similique commodi non dolores inventore dolor est aperiam.	1	2016-01-31 01:10:12.946-08	f
4	Laboriosam quia quam qui. Fugit vero laboriosam quibusdam et.	4	2016-04-26 12:05:08.34-07	f
6	In quas nesciunt corrupti. Aut possimus cupiditate consequatur et ducimus optio itaque.	4	2016-06-12 07:41:25.366-07	f
7	Incidunt suscipit necessitatibus sit tenetur assumenda cupiditate qui aut dolores. Dolorem voluptatibus est.	5	2016-05-31 04:20:44.336-07	f
8	Veniam sed at labore est error. Ab est quasi ut tempora. Et a porro dolore est. Nobis et voluptate sit et quia dignissimos esse magni magni.	5	2016-09-26 18:24:24.029-07	f
9	Culpa nemo aliquam iste et sunt ea voluptate aspernatur cupiditate. Nihil molestiae maxime laudantium distinctio repellat. Est sit ducimus unde maxime similique optio at animi at.	4	2016-09-17 04:34:45.787-07	f
11	Labore reiciendis corporis distinctio. Iure aut consectetur et ipsam et sed atque accusamus. Laboriosam porro quos minima optio debitis dolor iure. Autem voluptates qui excepturi voluptatibus itaque.	3	2016-05-07 16:58:44.412-07	f
12	Voluptas molestias sapiente rerum praesentium. Cumque ipsum eveniet vitae a et voluptatum quia corrupti. Fuga et porro dignissimos quis impedit laborum qui.	4	2016-02-17 09:00:49.459-08	f
13	Blanditiis provident explicabo. Minima ad veritatis ea voluptas qui.	2	2016-02-24 01:52:28.2-08	f
14	Eos id aperiam. Illo sed qui ab perferendis voluptatem saepe explicabo dicta vero. Saepe perferendis vel perspiciatis deserunt est est.	2	2015-12-06 23:16:59.8-08	f
16	Velit deleniti et et. Officia aut quo molestiae saepe est quia et nesciunt. Cum non et. Sequi esse ex.	4	2016-07-17 17:22:06.315-07	f
17	Rem iure eligendi voluptatem tempore a a assumenda et aliquid. Nihil nesciunt nam alias possimus magni magnam quia. Impedit enim quam sed quis incidunt sapiente amet.	5	2015-12-19 16:23:14.005-08	f
18	Qui sunt culpa iure ut distinctio non qui rerum aut. Dolor consequatur blanditiis reprehenderit natus hic aut amet.	5	2015-11-03 09:09:13.682-08	f
19	Fugit error et. Unde in iure.	14	2016-08-08 16:11:55.957-07	f
21	Voluptatem magnam autem veniam culpa a in. Expedita officia laboriosam ut est quae accusantium. Cum quia laborum sit laudantium est consequatur. Quae voluptas eos rem mollitia.	5	2016-09-06 14:41:04.911-07	f
22	Dolores est fugiat laboriosam. Voluptas qui cumque adipisci officia iste quibusdam. Perspiciatis alias deserunt quia accusantium.	2	2016-02-12 21:23:32.621-08	f
23	Labore magnam est voluptatem eum qui ad voluptas. Doloremque quisquam rerum nihil voluptas enim.	3	2016-03-11 13:08:33.599-08	f
24	Quidem eligendi vel. In facilis labore ducimus consequatur consequatur quam repellendus eos.	5	2016-08-24 13:53:42.162-07	f
26	Repellendus ullam et dolorem nesciunt assumenda sint. Hic natus at dolore. Qui exercitationem porro voluptas.	5	2016-04-09 23:11:48.393-07	f
27	Aut voluptatum fugit ducimus quas. Ea consectetur ullam qui et voluptatem.	4	2016-06-04 21:07:18.751-07	f
28	Eum iure laudantium officia doloremque et ut fugit ut. Magni eveniet ipsa.	1	2016-04-14 20:29:31.212-07	f
29	Culpa veritatis ipsum sapiente dolorem. Odio ut voluptatem. Doloremque rerum similique eum et consequuntur dolor.	2	2016-01-29 01:55:49.001-08	f
31	Nihil consequatur dolore tempore. A quis in veritatis quia non accusantium enim. Inventore aut quam officia.	4	2015-10-26 12:20:13.663-07	f
32	Iure aut veritatis. Nam inventore minus ullam deleniti delectus. Expedita corrupti sit sit facere expedita. Velit qui quis quia repellat atque recusandae praesentium eveniet.	4	2016-01-01 09:45:14.216-08	f
33	Incidunt quibusdam nulla adipisci error quia. Consequatur consequatur soluta fugit dolor iure. Voluptas accusamus fugiat assumenda enim.	1	2016-04-13 08:07:15.119-07	f
34	Non sed sequi sit libero. Accusantium consequatur sint impedit. Qui dolore reiciendis aut eius saepe et nemo enim cum. Atque qui molestiae.	3	2016-07-02 22:08:49.448-07	f
36	Quisquam reiciendis enim quam iusto quae dignissimos. Ut eum omnis. Fugit rerum at nihil sit.	4	2016-10-08 22:12:28.411-07	f
37	Commodi molestias velit voluptatum consequatur aliquid ipsa sequi voluptas. Nobis sed repellat odit. Architecto quasi dolorem non suscipit doloremque. Aperiam sed est consectetur.	4	2016-05-04 07:06:30.225-07	f
38	Quas omnis dignissimos eveniet non minus in voluptas. Aliquam porro non nihil impedit officia ut.	1	2016-02-21 21:11:46.205-08	f
39	Dolorem illo nulla et laboriosam dolore quia tempore consequatur. Est eum laudantium ut aspernatur earum. Quos quia dignissimos. Ea quaerat in.	4	2016-01-10 23:40:29.614-08	f
41	Sint a molestias sit repellendus dolorum dolorem. Nostrum veniam voluptas nihil omnis velit blanditiis numquam. Qui omnis repellendus quos. Sit iusto quis ipsam asperiores ea sit modi incidunt.	2	2015-12-24 06:52:08.723-08	f
42	Et at perspiciatis ab tempora quia porro dolorum omnis. Dolorem aliquam atque id est culpa omnis. Accusantium aut quia provident rerum nam modi. Voluptatem et necessitatibus quo repellat eum soluta voluptatem itaque sed.	2	2016-01-06 19:26:58.663-08	f
30	Aut non a et voluptate voluptate voluptas illo. Dolores nam voluptates expedita. Amet temporibus et.	1	2015-11-15 00:26:11.331-08	t
43	Commodi doloribus incidunt temporibus sed. Minima et maiores necessitatibus in delectus deserunt nulla velit.	4	2015-12-13 17:19:45.949-08	f
44	Et explicabo vitae error est necessitatibus architecto minima. Temporibus eius ipsa in ut et alias. Debitis non molestiae maxime provident dicta voluptas aut.	5	2016-04-02 19:18:58.665-07	f
46	Et sit quis quo ad incidunt est illo. Provident dolores qui repudiandae amet. Veniam quia quae. Ut voluptates ut atque cum.	5	2016-07-22 08:27:29.539-07	f
47	Dolores fugit qui eaque repellendus perspiciatis. Sequi est eligendi beatae at. Pariatur ut placeat exercitationem facere quidem omnis.	1	2016-01-07 08:27:09.5-08	f
48	Temporibus necessitatibus non eveniet repellat molestiae inventore. Qui quia optio repudiandae. Voluptas sit officiis omnis autem recusandae id voluptatem nisi. Perspiciatis quo delectus fugiat aut veniam dolore.	2	2016-08-08 13:57:18.444-07	f
49	Praesentium error eum aliquam. Rem culpa aspernatur. Rerum eos fugit.	4	2015-12-16 03:49:54.859-08	f
5	Sint minus aspernatur debitis ipsum sed architecto aliquid consequatur vero. Ea quod autem quos maiores ut non cupiditate.	4	2016-05-19 05:28:49.316-07	t
10	Omnis ut cum. Optio mollitia quia dolores quod sed temporibus dicta esse. Sit sit quia aut eveniet. Vero minus magnam consectetur enim qui qui harum.	4	2016-07-15 20:56:48.22-07	t
15	Ut consequatur distinctio est eligendi. Non saepe voluptatum ratione perspiciatis. Tenetur quis tenetur voluptas iure.	2	2015-11-17 08:32:39.077-08	t
20	Excepturi omnis hic. Sed dolorem sapiente officia. Aut eligendi architecto. Architecto tempore libero iste reiciendis magnam doloribus rerum.	2	2016-07-12 04:22:33.794-07	t
25	Laudantium itaque qui repellat nostrum eos aut reprehenderit accusamus. Aut a eaque quia ex perferendis quibusdam ratione quisquam sapiente. Ullam consequatur eaque qui delectus veniam nihil qui.	1	2015-12-14 21:59:02.324-08	t
35	Unde nam et aliquam corrupti nam. Omnis qui perferendis autem corrupti vitae et. Autem nam voluptas. Nobis quidem voluptatum qui.	2	2016-02-22 14:20:54.719-08	t
40	Debitis aut perspiciatis sint. Mollitia qui deserunt sint molestiae veritatis rem. Voluptate in dolorum non sint. Qui inventore dolorem quibusdam dolores sed ea alias recusandae voluptatem.	2	2015-12-24 02:35:29.442-08	t
45	Consequuntur at sit. Assumenda voluptate eum vitae consequuntur quia voluptatibus ut et minus.	3	2016-08-07 19:44:27.136-07	t
50	Dignissimos deserunt exercitationem voluptas ut suscipit aut quis placeat est. Velit consequatur quo cumque occaecati nihil. Quae provident suscipit voluptas qui omnis eum eaque.	2	2016-03-20 16:01:34.922-07	t
\.


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('posts_id_seq', 50, true);


--
-- Data for Name: relationships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY relationships (follower_id, followee_id, created_at, closeness) FROM stdin;
2	4	2016-06-20 16:07:29.756-07	acquaintence
2	2	2016-06-15 01:56:18.519-07	acquaintence
5	1	2016-04-30 09:57:37.224-07	acquaintence
4	2	2016-07-21 07:19:22.305-07	acquaintence
2	3	2016-05-18 14:35:54.601-07	acquaintence
2	1	2016-01-01 08:28:00.051-08	acquaintence
3	2	2016-10-09 23:43:33.874-07	best
3	3	2016-07-25 15:12:34.670-07	best
3	4	2016-04-21 00:17:32.344-07	best
1	4	2016-04-21 00:17:33.344-07	best
\.


--
-- Data for Name: sponsors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY sponsors (generation, first_name, last_name, num_legs, created_at) FROM stdin;
1	erlich	bachman	2	2016-10-17 17:49:07.364085-07
1	andrew	bachman	2	2016-10-17 17:49:07.364085-07
2	erlich	bachman	2	2016-10-17 17:49:07.364085-07
2	matt	bachman	2	2016-10-17 17:49:07.364085-07
1	matt	daemon	2	2016-10-17 17:49:07.364085-07
1	erlich	bachman	2	2016-10-17 17:49:07.364085-07
1	andrew	bachman	2	2016-10-17 17:49:07.364085-07
2	erlich	bachman	2	2016-10-17 17:49:07.364085-07
2	matt	bachman	2	2016-10-17 17:49:07.364085-07
1	matt	daemon	2	2016-10-17 17:49:07.364085-07
\.


--
-- Name: accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: likes_account_id_comment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY likes
    ADD CONSTRAINT likes_account_id_comment_id_key UNIQUE (account_id, comment_id);


--
-- Name: posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: relationships_follower_id_followee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY relationships
    ADD CONSTRAINT relationships_follower_id_followee_id_key UNIQUE (follower_id, followee_id);


--
-- Name: public; Type: ACL; Schema: -; Owner: -
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

