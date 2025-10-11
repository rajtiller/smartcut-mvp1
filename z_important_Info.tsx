// How to Link to a Website:
    declare let someImg: string;
    <div>
            <a href="https://website_name.com" target="_blank"> 
            {/* '_blank' here opens the link in a new tab, as opposed to overwriting the current tab */}
            <img src={someImg} className="image" alt="Image name" />
            </a>
    </div>