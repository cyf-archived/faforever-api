import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import axios from 'axios';

const baseURL = 'http://magict.cn:5000/webapi';

axios.defaults.withCredentials = true;

const request = (url, option = {}) => {
  return axios.request({
    url,
    baseURL,
    withCredentials: true,
    ...option,
  });
};

@Injectable()
export class AppService implements OnApplicationBootstrap {
  cookie: string[] = [];
  criteria: any[] = [];
  songs: any = {};
  bot: any;
  sid: string;

  onApplicationBootstrap() {
    this.login().then(() => {
      this.load();
    });
  }

  getHello(): string {
    return 'v1.0.0';
  }

  getCriteria() {
    return this.criteria;
  }

  getSongs() {
    return this.songs;
  }

  getSid() {
    return { sid: this.sid };
  }

  @Interval(5 * 60 * 1000)
  async load() {
    console.log('load ds data');

    const { data } = await this.getEntry();
    if (data.data && data.data.albums.length > 0) {
      this.criteria = data.data.albums;

      for (let index = 0; index < this.criteria.length; index++) {
        const albums = this.criteria[index];
        const { data: songs } = await this.loadSongs(
          albums.name,
          albums.album_artist,
        );
        if (songs.data && songs.data.songs.length > 0) {
          this.songs[albums.name] = songs.data.songs;
          this.criteria[index].count = songs.data.songs.length;
        }
      }
    }
  }

  async login() {
    const { data, headers } = await request(
      '/auth.cgi?api=SYNO.API.Auth&version=3&method=login&account=cyfwlp&passwd=5267373&session=AudioStation&format=cookie',
    );
    if (headers['set-cookie']) {
      this.cookie = headers['set-cookie'];
      this.sid = data.data.sid;
    }
  }

  async getEntry() {
    return await request(`/AudioStation/album.cgi`, {
      method: 'POST',
      data: 'api=SYNO.AudioStation.Album&method=list&version=1&library=all&sort_direction=asc&offset=0&sort_by=name&limit=5000',
      headers: {
        cookie: this.cookie,
      },
    });
  }

  async loadSongs(album, album_artist) {
    return request(`/AudioStation/song.cgi`, {
      method: 'POST',
      data: `api=SYNO.AudioStation.Song&method=list&version=3&library=all&additional=song_tag%2Csong_audio%2Csong_rating&album=${encodeURIComponent(
        album,
      )}&offset=0&album_artist=${encodeURIComponent(album_artist)}&limit=50000`,
      headers: {
        cookie: this.cookie,
      },
    });
  }
}
