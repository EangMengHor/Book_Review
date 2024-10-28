import express from "express";
import bodyParser from 'body-parser';
import axios from 'axios';
import pg from 'pg';

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Books",
    password: "Hor001",
    port: 5432
});

db.connect();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getBook() {
    try {
        const result = await db.query("SELECT * FROM book");
        return result.rows
    } catch (error) {
        console.error("Error fetching titles from database:", error);
        return [];
    }
}


async function fetchBookData(title) {
    try {
        const response = await axios.get(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`);
        const book = response.data.docs[0];
        return book ? { title: book.title, cover_i: book.cover_i } : null;
    } catch (error) {
        console.error(`Error fetching data for "${title}":`, error.message);
        return null;
    }
}

app.get("/", async (req, res) => {
    try {
        const books = await getBook();
        const coverPromises = books.map(book => fetchBookData(book.title));
        const covers = await Promise.all(coverPromises);
        
        const booksWithCovers = books.map((book, index) => ({
            ...book,
            ...covers[index]
        })).filter(book => book.cover_i);

        console.log('Covers:', covers);
        
        res.render('index.ejs', {
            books: booksWithCovers
        });
    } catch (error) {
        console.error('Error in main request handler:', error);
        res.status(500).send('Error fetching book data');
    }
});

app.post("/add", async (req, res) => {
    const newTitle = req.body.newBook;
    try {
        await db.query("INSERT INTO book (title) VALUES ($1)", [newTitle]);
        res.redirect('/');
    } catch (error) {
        console.error("Error adding new book:", error);
        res.status(500).send('Error adding new book');
    }
});

app.post("/delete", async (req, res)=>{
    const bookId = req.body.deleteID;
    try {
        await db.query("DELETE FROM book WHERE id=($1)", [bookId]);
        res.redirect("/");
        return;
    } catch (error) {
        console.error("Error deleting book:", error);
        res.status(500).send('Error deleting book');    
    }
})


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});