# -*- coding: utf-8 -*-
"""
Created on Fri Jul 10 11:20:31 2026
@author: kamak
"""
from flask import Flask, render_template[cite: 6]

app = Flask(__name__)[cite: 6]

@app.route('/')
def home():
    return render_template('index.html')[cite: 6]

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/story')
def story():
    return render_template('story.html')

@app.route('/brands')
def brands():
    return render_template('brands.html')

@app.route('/brand-details')
def brand_details():
    return render_template('brand_details.html')

if __name__ == '__main__':
    app.run(debug=False, port=5000)[cite: 6]
